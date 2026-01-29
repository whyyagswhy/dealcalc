
# Remove Social Logins

## Overview

Remove Google and Apple sign-in buttons from the authentication page to ensure the app works on networks where lovable.dev URLs are blocked.

## Changes

### src/pages/Auth.tsx

1. **Remove imports**: Delete the `lovable` import and `Separator` import (no longer needed)

2. **Remove state variables**: Delete `isGoogleLoading` and `isAppleLoading` state hooks

3. **Remove handler functions**: Delete `handleGoogleSignIn` and `handleAppleSignIn` functions

4. **Remove UI elements from Sign In tab** (lines 200-249):
   - Remove the "or" separator with divider
   - Remove both Google and Apple sign-in buttons

5. **Remove UI elements from Sign Up tab** (lines 282-331):
   - Remove the "or" separator with divider  
   - Remove both Google and Apple sign-in buttons

## Result

The authentication page will only show email/password forms for sign in and sign up, which work directly with the database and don't require any lovable.dev endpoints.
