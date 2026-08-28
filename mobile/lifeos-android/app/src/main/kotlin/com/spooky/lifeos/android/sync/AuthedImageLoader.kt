package com.spooky.lifeos.android.sync

import android.content.Context
import coil3.ImageLoader
import coil3.network.okhttp.OkHttpNetworkFetcherFactory
import com.spooky.lifeos.android.LifeosConfig
import okhttp3.OkHttpClient

/**
 * Moments/Grow-photo images are proxied through /api/.../image (app/api/moments/[id]/image,
 * app/api/grow/[id]/photos/[photoId]/image) — same bearer-token auth as every other call, not
 * a public URL. Coil has no idea about that token by default, so this wires a Coil `ImageLoader`
 * whose OkHttp call factory adds the same `Authorization: Bearer <token>` header BrowseClient's
 * `authedRequest` does, rather than pulling in a second, differently-authed HTTP stack.
 */
fun authedImageLoader(context: Context): ImageLoader {
    val config = LifeosConfig(context)
    val client = OkHttpClient.Builder()
        .addInterceptor { chain ->
            val token = config.getToken()
            val request = if (token != null) {
                chain.request().newBuilder().header("Authorization", "Bearer $token").build()
            } else {
                chain.request()
            }
            chain.proceed(request)
        }
        .build()

    return ImageLoader.Builder(context)
        .components { add(OkHttpNetworkFetcherFactory(callFactory = { client })) }
        .build()
}
