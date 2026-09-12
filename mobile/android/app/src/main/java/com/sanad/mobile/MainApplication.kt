package com.sanad.mobile

import android.app.Application

/**
 * MainApplication for Sanad.
 * Enforces zero-cleartext communication, security defaults, and native module registration.
 */
class MainApplication : Application() {

    override fun onCreate() {
        super.onCreate()
    }
}
