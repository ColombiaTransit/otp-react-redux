import PropTypes from 'prop-types'
import React, { Component } from 'react'
import {
  MenuItem,
  NavDropdown,
  NavItem
} from 'react-bootstrap'

/**
 * This component displays the sign-in status in the nav bar.
 * - When a user is not logged in: display 'Sign In' as a link or button.
 * - When a user is logged in, display an 'avatar' (retrieved from the profile prop)
 *   and a dropdown button so the user can access more options.
 */
export default class NavLoginButton extends Component {
  static propTypes = {
    id: PropTypes.string.isRequired,
    links: PropTypes.arrayOf(PropTypes.shape({
      target: PropTypes.string,
      text: PropTypes.string.isRequired,
      url: PropTypes.string.isRequired
    })),
    onSignInClick: PropTypes.func.isRequired,
    onSignOutClick: PropTypes.func.isRequired,
    profile: PropTypes.shape({
      email: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      nickname: PropTypes.string,
      picture: PropTypes.string
    })
  }

  static defaultProps = {
    links: null,
    profile: null
  }

  render () {
    const {
      className,
      id,
      links,
      onSignInClick,
      onSignOutClick,
      profile,
      style
    } = this.props

    const commonProps = {
      className,
      id,
      style
    }

    /**
      * HACK: Because we don't want to use this element inside a <Nav> while in mobile mode
      * (the menu items get displayed full screen width, which is undesirable),
      * the CSS rules below let us fit the sign-in component to the top-right corner
      * and add some of the visuals provided by react-bootstrap's <Nav> while in mobile mode.
      */
    const mobileStyle = (
      <style>{`
        .otp.mobile .navbar .container-fluid > li {
          display: block;
          padding: 15px;
          position: fixed;
          right: 0;
          top: 0;
        }
        .otp.mobile .navbar .container-fluid > li > a {
          color: #9d9d9d;
        }
        .otp.mobile .navbar li.dropdown.open {
          background-color: #080808;
        }
        .otp.mobile .navbar .container-fluid > li.dropdown.open > a {
          color: #fff;
        }
      `}
      </style>
    )

    if (profile) {
      const displayedName = profile.nickname || profile.name
      return (
        <NavDropdown
          {...commonProps}
          pullRight
          title={<span>
            {mobileStyle}
            <img
              alt={displayedName}
              src={profile.picture}
              style={{width: '2em', height: '2em', margin: '-15px 0'}}
              title={`${displayedName}\n(${profile.email})`}
            />
          </span>
          }>
          <MenuItem header>{displayedName}</MenuItem>

          {links && links.map((item, index) => (
            <MenuItem href={item.url} key={index} target={item.target}>{item.text}</MenuItem>
          ))}
          <MenuItem divider />
          <MenuItem onSelect={onSignOutClick}>Sign out</MenuItem>
        </NavDropdown>
      )
    }

    return (
      <NavItem {...commonProps} onClick={onSignInClick}>
        {mobileStyle}
        Sign in
      </NavItem>
    )
  }
}