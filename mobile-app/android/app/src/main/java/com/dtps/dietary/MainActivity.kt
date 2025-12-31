package com.dtps.dietary

import android.Manifest
import android.annotation.SuppressLint
import android.app.AlertDialog
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.os.Handler
import android.os.Looper
import android.provider.MediaStore
import android.view.View
import android.webkit.*
import android.widget.ProgressBar
import android.widget.TextView
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsControllerCompat
import java.io.File
import java.text.SimpleDateFormat
import java.util.*

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var splashWebView: WebView
    private lateinit var progressBar: ProgressBar
    private lateinit var offlineView: View
    private lateinit var offlineText: TextView
    private lateinit var retryButton: View

    private var fileUploadCallback: ValueCallback<Array<Uri>>? = null
    private var permissionCallback: PermissionRequest? = null
    private var splashComplete = false
    private val mainHandler = Handler(Looper.getMainLooper())
    
    // Camera photo URI
    private var cameraPhotoUri: Uri? = null

    companion object {
        private const val APP_URL = "https://dtps.tech/user"
        private const val SPLASH_URL = "file:///android_asset/splash.html"
        private val ALLOWED_HOSTS = listOf("dtps.tech")
    }

    // File picker launcher for gallery
    private val galleryPickerLauncher = registerForActivityResult(
        ActivityResultContracts.GetMultipleContents()
    ) { uris ->
        fileUploadCallback?.onReceiveValue(uris.toTypedArray())
        fileUploadCallback = null
    }

    // Camera launcher
    private val cameraLauncher = registerForActivityResult(
        ActivityResultContracts.TakePicture()
    ) { success ->
        if (success && cameraPhotoUri != null) {
            fileUploadCallback?.onReceiveValue(arrayOf(cameraPhotoUri!!))
        } else {
            fileUploadCallback?.onReceiveValue(null)
        }
        fileUploadCallback = null
        cameraPhotoUri = null
    }

    // Combined picker (camera + gallery)
    private val combinedPickerLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == RESULT_OK) {
            val data = result.data
            val uris = mutableListOf<Uri>()
            
            // Check if camera photo was taken
            if (cameraPhotoUri != null) {
                val file = File(cameraPhotoUri!!.path ?: "")
                if (file.exists() && file.length() > 0) {
                    uris.add(cameraPhotoUri!!)
                }
            }
            
            // Check for gallery selection
            data?.data?.let { uri -> 
                if (!uris.contains(uri)) {
                    uris.add(uri) 
                }
            }
            data?.clipData?.let { clipData ->
                for (i in 0 until clipData.itemCount) {
                    val uri = clipData.getItemAt(i).uri
                    if (!uris.contains(uri)) {
                        uris.add(uri)
                    }
                }
            }
            
            if (uris.isNotEmpty()) {
                fileUploadCallback?.onReceiveValue(uris.toTypedArray())
            } else {
                fileUploadCallback?.onReceiveValue(null)
            }
        } else {
            fileUploadCallback?.onReceiveValue(null)
        }
        fileUploadCallback = null
        cameraPhotoUri = null
    }

    private val multiplePermissionsLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { _ ->
        // All permissions handled
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Set up white status bar with dark icons
        WindowCompat.setDecorFitsSystemWindows(window, true)
        window.statusBarColor = ContextCompat.getColor(this, android.R.color.white)
        window.navigationBarColor = ContextCompat.getColor(this, android.R.color.white)
        WindowInsetsControllerCompat(window, window.decorView).apply {
            isAppearanceLightStatusBars = true
            isAppearanceLightNavigationBars = true
        }

        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        splashWebView = findViewById(R.id.splashWebView)
        progressBar = findViewById(R.id.progressBar)
        offlineView = findViewById(R.id.offlineView)
        offlineText = findViewById(R.id.offlineText)
        retryButton = findViewById(R.id.retryButton)

        setupSplashWebView()
        setupWebView()
        setupBackHandler()
        
        retryButton.setOnClickListener {
            loadUrl()
        }

        // Show splash first
        showSplash()
        
        // Request permissions after a short delay
        mainHandler.postDelayed({
            requestAllPermissions()
        }, 500)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupSplashWebView() {
        splashWebView.settings.apply {
            javaScriptEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            loadWithOverviewMode = true
            useWideViewPort = true
        }

        // Add JavaScript interface for communication
        splashWebView.addJavascriptInterface(SplashInterface(), "Android")

        splashWebView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                // Start loading main content in background
                webView.loadUrl(APP_URL)
            }
        }
    }

    inner class SplashInterface {
        @JavascriptInterface
        fun onSplashComplete() {
            mainHandler.post {
                hideSplash()
            }
        }
    }
    
    // JavaScript interface for native features
    inner class NativeInterface {
        @JavascriptInterface
        fun getFCMToken(): String {
            val prefs = getSharedPreferences("dtps_prefs", Context.MODE_PRIVATE)
            return prefs.getString("fcm_token", "") ?: ""
        }
        
        @JavascriptInterface
        fun isNativeApp(): Boolean {
            return true
        }
        
        @JavascriptInterface
        fun getDeviceType(): String {
            return "android"
        }
        
        @JavascriptInterface
        fun requestNotificationPermission() {
            mainHandler.post {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    if (ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.POST_NOTIFICATIONS) 
                        != PackageManager.PERMISSION_GRANTED) {
                        multiplePermissionsLauncher.launch(arrayOf(Manifest.permission.POST_NOTIFICATIONS))
                    }
                }
            }
        }
    }

    private fun showSplash() {
        splashWebView.visibility = View.VISIBLE
        webView.visibility = View.GONE
        splashWebView.loadUrl(SPLASH_URL)
    }

    private fun hideSplash() {
        if (!splashComplete) {
            splashComplete = true
            splashWebView.visibility = View.GONE
            webView.visibility = View.VISIBLE
            progressBar.visibility = View.GONE
        }
    }

    private fun requestAllPermissions() {
        val permissionsToRequest = mutableListOf<String>()

        // Check Camera permission
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) 
            != PackageManager.PERMISSION_GRANTED) {
            permissionsToRequest.add(Manifest.permission.CAMERA)
        }

        // Check Microphone permission
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) 
            != PackageManager.PERMISSION_GRANTED) {
            permissionsToRequest.add(Manifest.permission.RECORD_AUDIO)
        }

        // Check Notification permission (Android 13+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) 
                != PackageManager.PERMISSION_GRANTED) {
                permissionsToRequest.add(Manifest.permission.POST_NOTIFICATIONS)
            }
        }

        // Request all missing permissions at once
        if (permissionsToRequest.isNotEmpty()) {
            multiplePermissionsLauncher.launch(permissionsToRequest.toTypedArray())
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            cacheMode = WebSettings.LOAD_DEFAULT
            allowFileAccess = true
            allowContentAccess = true
            mediaPlaybackRequiresUserGesture = false
            setSupportMultipleWindows(false)
            loadWithOverviewMode = true
            useWideViewPort = true
            builtInZoomControls = true
            displayZoomControls = false
            mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
            
            // Enable modern web features
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                safeBrowsingEnabled = true
            }
        }
        
        // Add JavaScript interface for native features (FCM token, etc.)
        webView.addJavascriptInterface(NativeInterface(), "NativeApp")

        webView.webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                super.onPageStarted(view, url, favicon)
                if (splashComplete) {
                    progressBar.visibility = View.VISIBLE
                }
                offlineView.visibility = View.GONE
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                progressBar.visibility = View.GONE
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                super.onReceivedError(view, request, error)
                if (request?.isForMainFrame == true && splashComplete) {
                    showOfflineView()
                }
            }

            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: WebResourceRequest?
            ): Boolean {
                val url = request?.url?.toString() ?: return false
                val host = Uri.parse(url).host ?: return false

                // Allow navigation within allowed hosts
                if (ALLOWED_HOSTS.any { host == it || host.endsWith(".$it") }) {
                    return false
                }

                // Allow payment and auth providers
                if (host.contains("razorpay.com") || 
                    host.contains("googleapis.com") ||
                    host.contains("firebaseapp.com")) {
                    return false
                }

                // Open external links in browser
                return true
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                if (splashComplete) {
                    progressBar.progress = newProgress
                }
            }

            override fun onPermissionRequest(request: PermissionRequest?) {
                request?.let { permRequest ->
                    val resources = permRequest.resources
                    val permissions = mutableListOf<String>()

                    if (resources.contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE)) {
                        permissions.add(Manifest.permission.CAMERA)
                    }
                    if (resources.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE)) {
                        permissions.add(Manifest.permission.RECORD_AUDIO)
                    }

                    if (permissions.isEmpty()) {
                        permRequest.grant(resources)
                        return
                    }

                    val allGranted = permissions.all {
                        ContextCompat.checkSelfPermission(this@MainActivity, it) == 
                            PackageManager.PERMISSION_GRANTED
                    }

                    if (allGranted) {
                        permRequest.grant(resources)
                    } else {
                        permissionCallback = permRequest
                        requestPermissions(permissions.toTypedArray(), 100)
                    }
                }
            }

            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                fileUploadCallback?.onReceiveValue(null)
                fileUploadCallback = filePathCallback
                
                val acceptTypes = fileChooserParams?.acceptTypes ?: arrayOf("*/*")
                val isImageRequest = acceptTypes.any { 
                    it.contains("image") || it == "*/*" 
                }
                
                if (isImageRequest) {
                    // Show dialog with Camera and Gallery options
                    showImagePickerDialog()
                } else {
                    // For non-image files, use regular file picker
                    val mimeTypes = acceptTypes.joinToString(",").ifEmpty { "*/*" }
                    galleryPickerLauncher.launch(mimeTypes)
                }
                return true
            }
        }
    }
    
    private fun showImagePickerDialog() {
        val options = arrayOf("📷 Take Photo", "🖼️ Choose from Gallery", "Cancel")
        
        AlertDialog.Builder(this)
            .setTitle("Select Image")
            .setItems(options) { dialog, which ->
                when (which) {
                    0 -> openCamera()
                    1 -> openGallery()
                    else -> {
                        fileUploadCallback?.onReceiveValue(null)
                        fileUploadCallback = null
                    }
                }
                dialog.dismiss()
            }
            .setOnCancelListener {
                fileUploadCallback?.onReceiveValue(null)
                fileUploadCallback = null
            }
            .show()
    }
    
    private fun openCamera() {
        // Check camera permission
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) 
            != PackageManager.PERMISSION_GRANTED) {
            // Request permission then try again
            multiplePermissionsLauncher.launch(arrayOf(Manifest.permission.CAMERA))
            fileUploadCallback?.onReceiveValue(null)
            fileUploadCallback = null
            return
        }
        
        try {
            val photoFile = createImageFile()
            cameraPhotoUri = FileProvider.getUriForFile(
                this,
                "${packageName}.fileprovider",
                photoFile
            )
            cameraLauncher.launch(cameraPhotoUri)
        } catch (e: Exception) {
            e.printStackTrace()
            fileUploadCallback?.onReceiveValue(null)
            fileUploadCallback = null
        }
    }
    
    private fun openGallery() {
        galleryPickerLauncher.launch("image/*")
    }
    
    private fun createImageFile(): File {
        val timeStamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
        val imageFileName = "DTPS_${timeStamp}_"
        val storageDir = getExternalFilesDir(Environment.DIRECTORY_PICTURES)
        return File.createTempFile(imageFileName, ".jpg", storageDir)
    }

    private fun setupBackHandler() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    showExitDialog()
                }
            }
        })
    }

    private fun loadUrl() {
        offlineView.visibility = View.GONE
        webView.visibility = View.VISIBLE
        webView.loadUrl(APP_URL)
    }

    private fun showOfflineView() {
        progressBar.visibility = View.GONE
        offlineView.visibility = View.VISIBLE
    }

    private fun showExitDialog() {
        AlertDialog.Builder(this)
            .setTitle("Exit App")
            .setMessage("Are you sure you want to exit?")
            .setPositiveButton("Exit") { _, _ -> finish() }
            .setNegativeButton("Cancel", null)
            .show()
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 100) {
            permissionCallback?.let { callback ->
                val allGranted = grantResults.all { it == PackageManager.PERMISSION_GRANTED }
                if (allGranted) {
                    callback.grant(callback.resources)
                } else {
                    callback.deny()
                }
                permissionCallback = null
            }
        }
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
    }

    override fun onPause() {
        super.onPause()
        webView.onPause()
    }

    override fun onDestroy() {
        splashWebView.destroy()
        webView.destroy()
        super.onDestroy()
    }
}
