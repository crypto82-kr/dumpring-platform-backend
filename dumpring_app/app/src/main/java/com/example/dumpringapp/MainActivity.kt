package com.example.dumpringapp

import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import okhttp3.*
import java.io.IOException

class MainActivity : AppCompatActivity() {
    private val client = OkHttpClient()
    private lateinit var btnLoad: Button
    private lateinit var tvResult: TextView

    // TODO: 실제 백엔드 URL로 교체
    private val apiUrl = "https://your-backend.example.com/api/status"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        btnLoad = findViewById(R.id.btnLoad)
        tvResult = findViewById(R.id.tvResult)

        btnLoad.setOnClickListener { fetchStatus() }
    }

    private fun fetchStatus() {
        val request = Request.Builder()
            .url(apiUrl)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                runOnUiThread { tvResult.text = "API 호출 실패: ${'$'}{e.message}" }
            }

            override fun onResponse(call: Call, response: Response) {
                val body = response.body?.string()
                runOnUiThread { tvResult.text = body ?: "빈 응답" }
            }
        })
    }
}
