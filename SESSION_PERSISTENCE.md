# Session Persistence & Authentication Flow

## ✅ Session Persistence After Page Refresh

### Answer: **NO, users do NOT need to sign in again after refresh!**

## How It Works

### 1. **Login Process**
```typescript
// User logs in
const session = {
  access_token: "jwt_token_here",
  refresh_token: "refresh_token_here",
  user: { id: "...", email: "..." }
};

// Session is saved to localStorage
localStorage.setItem('session', JSON.stringify(session));
```

### 2. **Page Refresh**
```typescript
// On app load, AuthContext runs:
useEffect(() => {
    checkSession(); // Automatically runs on mount
}, []);

const checkSession = async () => {
    // 1. Check localStorage for existing session
    const storedSession = localStorage.getItem('session');
    
    if (storedSession) {
        // 2. Parse the session
        const session = JSON.parse(storedSession);
        
        // 3. Validate token with backend
        const response = await fetch('/api/auth/user', {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        
        if (response.ok) {
            // ✅ Token valid - user stays logged in!
            setUser(data.user);
            setSession(session);
        } else {
            // Token expired - try to refresh
            await refreshSession();
        }
    }
};
```

### 3. **Automatic Token Refresh**
```typescript
const refreshSession = async () => {
    const { refresh_token } = storedSession;
    
    // Call refresh endpoint
    const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refresh_token })
    });
    
    if (response.ok) {
        // ✅ New token received - user stays logged in!
        const newSession = await response.json();
        localStorage.setItem('session', JSON.stringify(newSession));
    } else {
        // ❌ Refresh failed - logout user
        await logout();
    }
};
```

## Session Lifetime

### Access Token
- **Typical Duration**: 1 hour (configurable in Supabase)
- **Purpose**: Used for API authentication
- **Storage**: localStorage

### Refresh Token
- **Typical Duration**: 30 days (configurable in Supabase)
- **Purpose**: Get new access tokens
- **Storage**: localStorage

### Real-World Scenarios

#### ✅ User Closes Browser
- Session persists in localStorage
- Next visit: Auto-login (if tokens valid)

#### ✅ User Refreshes Page
- Session immediately restored from localStorage
- Token validated with backend
- User stays logged in

#### ✅ Access Token Expires (after 1 hour)
- Refresh token automatically used
- New access token obtained
- User never notices

#### ❌ Refresh Token Expires (after 30 days)
- Automatic refresh fails
- User logged out
- Must sign in again

#### ❌ User Clicks "Logout"
- localStorage cleared
- Session terminated
- Must sign in again

## Updated Room API with Authentication

### Changes Made to `useRooms.ts`

#### Before (Direct Supabase)
```typescript
export function useRooms() {
    // Direct Supabase queries
    const { data, error } = await supabase
        .from('history')
        .select('*')
        .order('created_at', { ascending: false });
}
```

#### After (Authenticated API)
```typescript
export function useRooms() {
    // Get auth headers from localStorage
    const getAuthHeaders = () => {
        const session = JSON.parse(localStorage.getItem('session'));
        return {
            'Authorization': `Bearer ${session.access_token}`
        };
    };
    
    // Fetch with authentication
    const response = await fetch('http://localhost:3000/api/room', {
        headers: getAuthHeaders()
    });
}
```

### All API Endpoints Now Include Auth

#### GET /api/room - Fetch All Rooms
```typescript
const headers = getAuthHeaders();
const response = await fetch(`${API_BASE}/room`, { headers });
// Returns only rooms owned by authenticated user
```

#### GET /api/room/:id - Fetch Single Room
```typescript
const headers = getAuthHeaders();
const response = await fetch(`${API_BASE}/room/${id}`, { headers });
// Verifies user owns the room
```

#### POST /api/room - Create Room
```typescript
const headers = getAuthHeaders();
const response = await fetch(`${API_BASE}/room`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ title, aiAnswers, userAnswers })
});
// Automatically associates room with authenticated user
```

#### PUT /api/room/:id - Update Room
```typescript
const headers = getAuthHeaders();
const response = await fetch(`${API_BASE}/room/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(updates)
});
// Verifies ownership before update
```

#### DELETE /api/room/:id - Delete Room
```typescript
const headers = getAuthHeaders();
const response = await fetch(`${API_BASE}/room/${id}`, {
    method: 'DELETE',
    headers
});
// Verifies ownership before deletion
```

## Security Benefits

### 1. **User Isolation**
- Each user only sees their own rooms
- Backend filters by `user_id`
- No manual filtering needed

### 2. **Automatic Authorization**
- All API calls include Bearer token
- Backend validates on every request
- Invalid tokens rejected automatically

### 3. **Ownership Verification**
- Can't access other users' rooms
- Can't modify other users' data
- Can't delete other users' rooms

### 4. **Token Expiration**
- Automatic refresh keeps sessions secure
- Old tokens eventually expire
- Compromised tokens have limited lifetime

## Error Handling

### No Session Found
```typescript
// If user not logged in
throw new Error('No session found. Please log in.');
// User automatically redirected to login page
```

### Invalid/Expired Token
```typescript
// If token invalid
if (!response.ok) {
    // Attempt refresh
    await refreshSession();
}
// If refresh fails, logout
```

### Network Errors
```typescript
try {
    const response = await fetch(...);
} catch (err) {
    console.error("Error:", err);
    setError(err.message);
    // Display error to user
}
```

## Summary

| Scenario | User Must Re-login? | Why |
|----------|-------------------|-----|
| Page refresh | ❌ No | Session in localStorage |
| Close browser | ❌ No | localStorage persists |
| New browser tab | ❌ No | localStorage shared |
| 1 hour later | ❌ No | Token auto-refreshed |
| 30 days later | ✅ Yes | Refresh token expired |
| Click logout | ✅ Yes | Manual logout |
| Clear browser data | ✅ Yes | localStorage cleared |

## Best Practices

### 1. **Always Use Helper Function**
```typescript
const headers = getAuthHeaders();
// Centralized auth header management
```

### 2. **Handle Errors Gracefully**
```typescript
try {
    const headers = getAuthHeaders();
    // ... API call
} catch (err) {
    if (err.message === 'No session found') {
        // User will be redirected to login
    }
}
```

### 3. **Keep Session Updated**
```typescript
// After refresh, update localStorage
localStorage.setItem('session', JSON.stringify(newSession));
```

The implementation provides seamless authentication with minimal user friction while maintaining strong security! 🔐
