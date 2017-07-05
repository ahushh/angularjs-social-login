const socialLogin = angular.module('socialLogin', [])

socialLogin.provider('social', function () {
	let fbKey, fbApiV, googleKey, linkedInKey
	return {
		setFbKey: (obj) => {
			let appId = fbKey = obj.appId
			let version = fbApiV = obj.apiVersion
      let ref = document.getElementsByTagName('script')[0]
			let fbJs = document.createElement('script')
			fbJs.id = 'facebook-jssdk'
			fbJs.async = true
			fbJs.src = '//connect.facebook.net/en_US/sdk.js'
			fbJs.onload = () => {
				FB.init({ 
					appId,
					status: true, 
					cookie: true, 
					xfbml: true,
					version
				})
			}
			ref.parentNode.insertBefore(fbJs, ref)
		},
		setGoogleKey: (client_id) => {
			googleKey = client_id
      let ref = document.getElementsByTagName('script')[0]
			let gJs = document.createElement('script')
			gJs.async = true;
			gJs.src = '//apis.google.com/js/platform.js'
			gJs.onload = () => {
				gapi.load('auth2', () => {
					gapi.auth2.init({client_id, scope: 'email'})
        })
			}
      ref.parentNode.insertBefore(gJs, ref)
		},
		setLinkedInKey: (value) => {
      linkedInKey = value
      let ref = document.getElementsByTagName('script')[0]
			let lIN = document.createElement('script')
			lIN.async = false
			lIN.src = '//platform.linkedin.com/in.js'
			lIN.text = `api_key: ${linkedInKey.replace('"', '')}`
			ref.parentNode.insertBefore(lIN, ref)
		},
		$get: () => ({ fbKey, googleKey, linkedInKey, fbApiV })
	}
})

/* @ngInject */
socialLogin.factory('socialLoginService', function ($window, $rootScope) {
	return {
		logout: () => {
			let provider = $window.localStorage.getItem('_login_provider')
			switch(provider) {
				case 'google':
					//its a hack need to find better solution.
					let gElement = document.getElementById('gSignout')
					if (typeof(gElement) !== 'undefined' && gElement != null) {
					  gElement.remove()
					}
					let ref = d.getElementsByTagName('script')[0]
					let gSignout = d.createElement('script')
					gSignout.src = 'https://accounts.google.com/Logout'
					gSignout.type = 'text/html'
					gSignout.id = 'gSignout'
					$window.localStorage.removeItem('_login_provider')
					$rootScope.$broadcast('event:social-sign-out-success', 'success')
					ref.parentNode.insertBefore(gSignout, ref)
					break
				case 'linkedIn':
					IN.User.logout(_ => {
						$window.localStorage.removeItem('_login_provider')
					 	$rootScope.$broadcast('event:social-sign-out-success', 'success')
					}, {})
					break
				case 'facebook':
					FB.logout(_ => {
						$window.localStorage.removeItem('_login_provider');
					 	$rootScope.$broadcast('event:social-sign-out-success', 'success');
					})
					break
			}
		},
		setProvider: (provider) => {
			$window.localStorage.setItem('_login_provider', provider)
		}
	}
})

/* @ngInject */
socialLogin.directive('linkedIn', function ($rootScope, social, socialLoginService) {
	return {
		restrict: 'EA',
		scope: {},
		link: (scope, elem, attr) => {
		    elem.on('click', () => {
		  		IN.User.authorize(() => {
					IN.API.Raw('/people/~:(id,first-name,last-name,email-address,picture-url)')
						.result(res => {
							socialLoginService.setProvider('linkedIn')
							let userDetails = {
								name: `${res.firstName} ${res.lastName}`,
								email: res.emailAddress,
								uid: res.id,
								provider: 'linkedIN',
								imageUrl: res.pictureUrl
							}
							$rootScope.$broadcast('event:social-sign-in-success', userDetails);
						})
					})
				})
		}
	}
})

/* @ngInject */
socialLogin.directive('gLogin', function ($rootScope, social, socialLoginService) {
	return {
		restrict: 'EA',
		scope: {},
		replace: true,
		link: (scope, elem, attr) => {
			elem.on('click', () => {
				let fetchUserDetails = () => {
					let currentUser = scope.gauth.currentUser.get()
					let profile = currentUser.getBasicProfile()
					let idToken = currentUser.getAuthResponse().id_token
					let token = currentUser.getAuthResponse().access_token
					return {
						token,
						idToken,
						name: profile.getName(), 
						email: profile.getEmail(), 
						uid: profile.getId(), 
						provider: 'google',
						imageUrl: profile.getImageUrl()
					}
				}

				if (typeof(scope.gauth) === 'undefined') {
          scope.gauth = gapi.auth2.getAuthInstance()
        }
				if (!scope.gauth.isSignedIn.get()) {
					scope.gauth.signIn().then(googleUser => {
						socialLoginService.setProvider('google')
						$rootScope.$broadcast('event:social-sign-in-success', fetchUserDetails())
					}).catch(err => console.log(err))
				} else {
					socialLoginService.setProvider('google')
					$rootScope.$broadcast('event:social-sign-in-success', fetchUserDetails())
				}
			})
		}
	}
})

/* @ngInject */
socialLogin.directive('fbLogin', function ($rootScope, social, socialLoginService, $q) {
	return {
		restrict: 'EA',
		scope: {},
		replace: true,
		link: (scope, elem, attr) => {
			elem.on('click', () => {
				let fetchUserDetails = () => {
					let deferred = $q.defer()
					FB.api('/me?fields=name,email,picture', res => {
						if (!res || res.error) {
							deferred.reject('Error occured while fetching user details.');
						} else {
							deferred.resolve({
								name: res.name, 
								email: res.email, 
								uid: res.id, 
								provider: 'facebook',
								imageUrl: res.picture.data.url
							})
						}
					})
					return deferred.promise
				}

				FB.getLoginStatus( response => {
					if (response.status === 'connected') {
						fetchUserDetails().then(userDetails => {
							userDetails.token = response.authResponse.accessToken
							socialLoginService.setProvider('facebook')
							$rootScope.$broadcast('event:social-sign-in-success', userDetails)
						})
					} else {
						FB.login(response => {
							if (response.status === 'connected') {
								fetchUserDetails().then(userDetails => {
                  userDetails.token = response.authResponse.accessToken
                  socialLoginService.setProvider('facebook')
                  $rootScope.$broadcast('event:social-sign-in-success', userDetails)
								})
							}
						}, {scope: 'email', auth_type: 'rerequest'})
					}
				})
			})
		}
	}
})

export default socialLogin