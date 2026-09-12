package com.sanad.mobile.keystore

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * Native Android KeyStore & EncryptedSharedPreferences Bridge.
 * Adheres to Sanad Security Model Section 5:
 * - Master key stored in Android KeyStore (AES-256-GCM).
 * - EncryptedSharedPreferences for local token and alias storage.
 * - Emergency purge capability for checkpoint security.
 */
class SanadKeyStoreModule(private val context: Context) {

    private val masterKey: MasterKey by lazy {
        MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
    }

    private val securePreferences: SharedPreferences by lazy {
        EncryptedSharedPreferences.create(
            context,
            "sanad_secure_vault",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    fun setItem(key: String, value: String): Boolean {
        return securePreferences.edit().putString(key, value).commit()
    }

    fun getItem(key: String): String? {
        return securePreferences.getString(key, null)
    }

    fun removeItem(key: String): Boolean {
        return securePreferences.edit().remove(key).commit()
    }

    /**
     * Emergency purge: Instantly clears all encrypted preferences and resets the vault.
     */
    fun purgeVault(): Boolean {
        return securePreferences.edit().clear().commit()
    }
}
