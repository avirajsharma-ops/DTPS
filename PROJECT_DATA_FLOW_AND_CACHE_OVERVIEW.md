# Project Data Flow & Caching (Non-Technical Overview)

## 1. What is used in this project?
- **Frontend:** React/Next.js (runs in your browser)
- **Backend/API:** Next.js API routes, connects to MongoDB
- **Authentication:** NextAuth for login/session
- **Cache:** Used to speed up data, but now mostly disabled for payments and sensitive data
- **Session/Local Storage:** Browser stores login/session info and sometimes small data

## 2. What cache is used?
- **Memory Cache:** Was used on the server (Node.js) to store API results for a short time
- **Browser Cache:** Browser may store static files (images, scripts), but not sensitive data
- **Server Cache:** Server could cache API responses, but for payments and user data, this is now disabled
- **Header Cache:** HTTP headers like `Cache-Control` are set to `no-store` for APIs to prevent caching
- **API Cache:** Some APIs used to cache results, but now most are set to always fetch fresh data

## 3. How does the data flow work?
1. **Frontend Loads:** When you open the website, the browser loads the React/Next.js app
2. **API Request:** The frontend asks the backend (API) for data (like payments, notes, user info)
3. **Backend Responds:** The backend fetches data from the database and sends it to the frontend
4. **Frontend Shows Data:** The browser displays the data to you
5. **Fresh Data:** For important info (like payments), the frontend always asks for the latest data—no cache
6. **Session:** Your login info is kept in a session (cookie or local storage) so you stay logged in

## 4. When is fresh data fetched and shown?
- **Always for Payments & Sensitive Info:** The frontend always fetches new data from the backend, never from cache
- **Other Data:** Some less important data may be cached for speed, but most is fetched fresh
- **Manual Refresh:** Sometimes, you can click a refresh button to get the latest data

## 5. How is cache/session/local storage accessed?
- **Session:** The browser keeps you logged in using cookies or local storage
- **Local Storage:** May store small, non-sensitive info for quick access
- **Cache:** Used to be on the server for APIs, but now mostly turned off for real-time accuracy

## 6. Why was cache a problem?
- **Stale Data:** Cache sometimes showed old payment info or user data, causing confusion
- **Logout Issues:** Cached session info could log users out unexpectedly
- **Fix:** Now, cache is disabled for important APIs. The frontend always gets fresh data, so you see the latest info

## 7. Why do you need to clear cache and reload?
- **Old Problem:** Before, if the cache was not cleared, you might see old data or get logged out
- **Now:** With cache disabled for important data, you should always see the latest info without clearing cache

## 8. Summary
- The website loads in your browser and asks the backend for data
- The backend gets the latest info from the database and sends it to your browser
- For important things (like payments), the website always gets fresh data—no cache
- Your login/session is kept safe in the browser
- Cache was causing old data and logout problems, so it’s now turned off for sensitive info
- You should not need to clear cache anymore to see the latest data


 9. Why does data sometimes not show on the frontend or show errors?


Sometimes, you may not see data on the website or you might see an error. Here are the most common reasons, explained simply:


- **Internet/Network Issues:** If your internet is slow or disconnected, the website cannot fetch new data from the backend.
- **Backend/API Problems:** If the server or database is down, or there is a bug in the backend code, the frontend cannot get the data it needs.
- **Session Expired:** If you are logged out (session expired), the website cannot access your data until you log in again.
- **Data Not Available:** Sometimes, there is no data to show (for example, no payments or notes yet), so the page looks empty.
- **Cache Issues (Old Problem):** In the past, cache could show old or missing data. This is now mostly fixed for important data.
- **Browser Issues:** Rarely, your browser may have a problem (like a stuck tab or old version). Refreshing the page or clearing browser cache can help.
- **Code Errors:** Sometimes, there is a bug in the website code that causes an error or blank page. This needs to be fixed by the development team.


# 10. Is any data saved in server memory or server cache?

In the past, some data (like payment info or user lists) was temporarily saved in the server's memory (RAM) to make the website faster. This is called "server memory cache." It means the backend would remember some results for a short time, so it didn't have to ask the database every time.

**Currently:**
- For important and sensitive data (like payments, user info, and notes), this server memory cache is now turned off. The backend always fetches the latest data from the database for these APIs.
- For some less important or rarely changing data (like static lists or settings), the server might still use memory cache, but this is not common in your project now.

**Why?**
- Server memory cache was causing problems with old or missing data, especially for payments and user sessions. That's why it was disabled for these features.

**Summary:**
- Most important data is NOT saved in server memory or cache anymore. You always get the latest info from the database.
- If any server cache is used, it is only for non-sensitive, rarely changing data.
# Project Data Flow & Caching (Non-Technical Overview)


## 1. What is used in this project?
- **Frontend:** React/Next.js (runs in your browser)
- **Backend/API:** Next.js API routes, connects to MongoDB
- **Authentication:** NextAuth for login/session
- **Cache:** Used to speed up data, but now mostly disabled for payments and sensitive data
- **Session/Local Storage:** Browser stores login/session info and sometimes small data