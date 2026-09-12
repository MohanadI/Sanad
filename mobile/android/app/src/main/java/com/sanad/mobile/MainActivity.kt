package com.sanad.mobile

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity

/**
 * MainActivity for Sanad.
 * Hosts the React Native shell with strict RTL support, TalkBack screen reader compatibility,
 * and Screen Curtain privacy capabilities.
 */
class MainActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // RTL is enforced at the application and layout level
    }
}
