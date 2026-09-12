package com.sanad.mobile.emergency

import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.media.AudioManager
import android.media.ToneGenerator
import android.net.Uri
import android.os.Build
import android.os.CountDownTimer
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.core.content.ContextCompat
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import org.json.JSONArray
import org.json.JSONObject

/**
 * Autonomous Native Android Emergency Subsystem (ADR-005).
 * 
 * Invariants:
 * 1. ZERO cloud dependency: Executes 100% on-device with no network calls or DNS lookups.
 * 2. Hardware & Keyword Triggers: Supports 5 rapid hardware button presses and Palestinian Arabic distress keywords.
 * 3. Deterministic 5-second countdown with audible tones/earcons and haptic pulses.
 * 4. Cancellation via spoken "إلغاء" or volume button abort.
 * 5. Direct native telephony intent (Intent.ACTION_CALL / Intent.ACTION_DIAL).
 * 6. Sovereign offline encrypted audit queue for deferred post-connection sync.
 */
class EmergencyNativeModule(private val context: Context) {

    enum class EmergencyState {
        IDLE,
        COUNTDOWN,
        DISPATCHED,
        CANCELLED
    }

    interface CountdownListener {
        fun onTick(secondsRemaining: Int)
        fun onDispatched(channel: String)
        fun onCancelled(reason: String)
    }

    private var currentState: EmergencyState = EmergencyState.IDLE
    private var countDownTimer: CountDownTimer? = null
    private var listener: CountdownListener? = null
    private var lastHardwarePressTimestamp: Long = 0L
    private var hardwarePressCount: Int = 0

    // Offline distress and cancel keywords (Palestinian Arabic)
    private val distressKeywords = setOf(
        "طوارئ",
        "طواري",
        "النجدة",
        "النجده",
        "ساعدوني",
        "احميني",
        "انقذوني",
        "emergency"
    )

    private val cancelKeywords = setOf(
        "إلغاء",
        "الغاء",
        "تراجع",
        "وقف",
        "cancel",
        "stop"
    )

    private val vibrator: Vibrator? by lazy {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vibratorManager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
            vibratorManager?.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        }
    }

    private val toneGenerator: ToneGenerator? by lazy {
        try {
            ToneGenerator(AudioManager.STREAM_ALARM, 100)
        } catch (_: Exception) {
            null
        }
    }

    private val securePreferences: SharedPreferences by lazy {
        try {
            val masterKey = MasterKey.Builder(context)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()
            EncryptedSharedPreferences.create(
                context,
                "sanad_emergency_offline_vault",
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            )
        } catch (_: Exception) {
            context.getSharedPreferences("sanad_emergency_offline_vault_fallback", Context.MODE_PRIVATE)
        }
    }

    fun setCountdownListener(listener: CountdownListener?) {
        this.listener = listener
    }

    fun getState(): EmergencyState = currentState

    /**
     * Checks if spoken text matches Palestinian Arabic distress keywords.
     */
    fun matchesDistressKeyword(spokenText: String): Boolean {
        val normalized = spokenText.trim().lowercase()
        return distressKeywords.any { keyword -> normalized.contains(keyword) }
    }

    /**
     * Checks if spoken text matches cancel keywords.
     */
    fun matchesCancelKeyword(spokenText: String): Boolean {
        val normalized = spokenText.trim().lowercase()
        return cancelKeywords.any { keyword -> normalized.contains(keyword) }
    }

    /**
     * Hardware button trigger pattern: 5 rapid presses within 2.5 seconds.
     */
    fun onHardwareButtonPress(trustedNumber: String = "101"): Boolean {
        val now = System.currentTimeMillis()
        if (now - lastHardwarePressTimestamp < 500) {
            hardwarePressCount++
        } else {
            hardwarePressCount = 1
        }
        lastHardwarePressTimestamp = now

        if (hardwarePressCount >= 5) {
            hardwarePressCount = 0
            startEmergencyCountdown("HARDWARE_BUTTON_PATTERN", trustedNumber)
            return true
        }
        return false
    }

    /**
     * Initiates the deterministic 5-second countdown with audible earcons and haptic pulses.
     */
    @Synchronized
    fun startEmergencyCountdown(
        triggerType: String,
        trustedNumber: String = "101",
        countdownDurationMs: Long = 5000L
    ) {
        if (currentState == EmergencyState.COUNTDOWN) {
            return
        }

        currentState = EmergencyState.COUNTDOWN
        playTickCue(5)

        countDownTimer?.cancel()
        countDownTimer = object : CountDownTimer(countdownDurationMs, 1000L) {
            override fun onTick(millisUntilFinished: Long) {
                val secondsRemaining = ((millisUntilFinished / 1000L) + 1).toInt()
                playTickCue(secondsRemaining)
                Handler(Looper.getMainLooper()).post {
                    listener?.onTick(secondsRemaining)
                }
            }

            override fun onFinish() {
                dispatchEmergencyCall(trustedNumber, triggerType)
            }
        }.start()
    }

    /**
     * Cancels an active countdown immediately.
     */
    @Synchronized
    fun cancelEmergency(reason: String = "USER_CANCEL"): Boolean {
        if (currentState != EmergencyState.COUNTDOWN) {
            return false
        }

        countDownTimer?.cancel()
        countDownTimer = null
        currentState = EmergencyState.CANCELLED

        playCancelCue()
        enqueueOfflineAuditLog("EMERGENCY_CANCELLED", reason)

        Handler(Looper.getMainLooper()).post {
            listener?.onCancelled(reason)
        }

        // Return to IDLE after cancellation notification
        Handler(Looper.getMainLooper()).postDelayed({
            if (currentState == EmergencyState.CANCELLED) {
                currentState = EmergencyState.IDLE
            }
        }, 1500L)

        return true
    }

    /**
     * Direct dispatch of native telephony intent with zero network calls.
     */
    @Synchronized
    private fun dispatchEmergencyCall(trustedNumber: String, triggerType: String) {
        currentState = EmergencyState.DISPATCHED
        countDownTimer = null

        playDispatchedCue()

        // Zero PII audit: record trigger type and event, NEVER the raw phone number
        enqueueOfflineAuditLog("EMERGENCY_DISPATCHED", triggerType)

        val hasCallPermission = ContextCompat.checkSelfPermission(
            context,
            android.Manifest.permission.CALL_PHONE
        ) == PackageManager.PERMISSION_GRANTED

        val intent = if (hasCallPermission) {
            Intent(Intent.ACTION_CALL, Uri.parse("tel:$trustedNumber"))
        } else {
            Intent(Intent.ACTION_DIAL, Uri.parse("tel:$trustedNumber"))
        }
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK

        try {
            context.startActivity(intent)
        } catch (_: Exception) {
            // If ACTION_CALL fails for any reason, fallback to ACTION_DIAL
            val dialIntent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$trustedNumber")).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(dialIntent)
        }

        Handler(Looper.getMainLooper()).post {
            listener?.onDispatched("LOCAL_NATIVE_DIALER")
        }
    }

    /**
     * Audio and haptic feedback during countdown tick.
     */
    private fun playTickCue(secondsRemaining: Int) {
        try {
            toneGenerator?.startTone(ToneGenerator.TONE_PROP_BEEP2, 150)
        } catch (_: Exception) {}

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator?.vibrate(VibrationEffect.createOneShot(120, VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION")
                vibrator?.vibrate(120)
            }
        } catch (_: Exception) {}
    }

    private fun playCancelCue() {
        try {
            toneGenerator?.startTone(ToneGenerator.TONE_PROP_PROMPT, 300)
        } catch (_: Exception) {}

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator?.vibrate(VibrationEffect.createOneShot(250, VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION")
                vibrator?.vibrate(250)
            }
        } catch (_: Exception) {}
    }

    private fun playDispatchedCue() {
        try {
            toneGenerator?.startTone(ToneGenerator.TONE_CDMA_EMERGENCY_RINGBACK, 500)
        } catch (_: Exception) {}

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator?.vibrate(
                    VibrationEffect.createWaveform(
                        longArrayOf(0, 200, 100, 200),
                        intArrayOf(0, 255, 0, 255),
                        -1
                    )
                )
            } else {
                @Suppress("DEPRECATION")
                vibrator?.vibrate(longArrayOf(0, 200, 100, 200), -1)
            }
        } catch (_: Exception) {}
    }

    /**
     * Stores zero-PII emergency telemetry in local encrypted storage for later synchronization.
     */
    private fun enqueueOfflineAuditLog(eventType: String, triggerType: String) {
        try {
            val existingJson = securePreferences.getString("offline_telemetry_queue", "[]") ?: "[]"
            val array = JSONArray(existingJson)
            val event = JSONObject().apply {
                put("eventId", "emg_${System.currentTimeMillis()}")
                put("eventType", eventType)
                put("triggerType", triggerType)
                put("channel", "LOCAL_NATIVE_DIALER")
                put("timestamp", System.currentTimeMillis())
            }
            array.put(event)
            securePreferences.edit().putString("offline_telemetry_queue", array.toString()).apply()
        } catch (_: Exception) {}
    }

    fun getOfflineQueueSize(): Int {
        val existingJson = securePreferences.getString("offline_telemetry_queue", "[]") ?: "[]"
        return try {
            JSONArray(existingJson).length()
        } catch (_: Exception) {
            0
        }
    }

    fun clearOfflineQueue() {
        securePreferences.edit().remove("offline_telemetry_queue").apply()
    }
}
