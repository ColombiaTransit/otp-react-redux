import { createAction } from 'redux-actions'

import { addUser, fetchUser, updateUser } from '../util/middleware'
import { isNewUser } from '../util/user'

const setCurrentUser = createAction('SET_CURRENT_USER')
export const setPathBeforeSignIn = createAction('SET_PATH_BEFORE_SIGNIN')

function getStateForNewUser (auth0User) {
  return {
    auth0UserId: auth0User.sub,
    email: auth0User.email,
    hasConsentedToTerms: false, // User must agree to terms.
    notificationChannel: 'email',
    phoneNumber: '',
    savedLocations: [],
    storeTripHistory: false // User must opt in.
  }
}

/**
 * Fetches user preferences to state.user, or set initial values under state.user if no user has been loaded.
 */
export function fetchOrInitializeUser (auth) {
  return async function (dispatch, getState) {
    const { otp } = getState()
    const { accessToken, user } = auth

    try {
      const result = await fetchUser(
        otp.config.persistence.otp_middleware,
        accessToken
      )

      // Beware! On AWS API gateway, if a user is not found in the middleware
      // (e.g. they just created their Auth0 password but have not completed the account setup form yet),
      // the call above will return, for example:
      // {
      //    status: 'success',
      //    data: {
      //      "result": "ERR",
      //      "message": "No user with id=000000 found.",
      //      "code": 404,
      //      "detail": null
      //    }
      // }
      //
      // The same call to a middleware instance that is not behind an API gateway
      // will return:
      // {
      //    status: 'error',
      //    message: 'Error get-ing user...'
      // }
      // TODO: Improve AWS response.

      const resultData = result.data
      const isNewAccount = result.status === 'error' || (resultData && resultData.result === 'ERR')

      if (!isNewAccount) {
        // TODO: Move next line somewhere else.
        if (resultData.savedLocations === null) resultData.savedLocations = []
        dispatch(setCurrentUser({ accessToken, user: resultData }))
      } else {
        dispatch(setCurrentUser({ accessToken, user: getStateForNewUser(user) }))
      }
    } catch (error) {
      // TODO: improve error handling.
      alert(`An error was encountered:\n${error}`)
    }
  }
}

/**
 * Updates (or creates) a user entry in the middleware,
 * then, if that was successful, updates the redux state with that user.
 */
export function createOrUpdateUser (userData) {
  return async function (dispatch, getState) {
    const { otp, user } = getState()
    const { otp_middleware: otpMiddleware = null } = otp.config.persistence

    if (otpMiddleware) {
      const { accessToken, loggedInUser } = user

      let result
      if (isNewUser(loggedInUser)) {
        result = await addUser(otpMiddleware, accessToken, userData)
      } else {
        result = await updateUser(otpMiddleware, accessToken, userData)
      }

      // TODO: improve the UI feedback messages for this.
      if (result.status === 'success' && result.data) {
        // Update application state with the user entry as saved
        // (as returned) by the middleware.
        const userData = result.data
        dispatch(setCurrentUser({ accessToken, user: userData }))

        alert('Your preferences have been saved.')
      } else {
        alert(`An error was encountered:\n${JSON.stringify(result)}`)
      }
    }
  }
}
