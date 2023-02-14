import { StyledIconBase } from '@styled-icons/styled-icon'
import React from 'react'
import styled, { keyframes } from 'styled-components'

interface Props {
  flipHorizontal?: boolean
  rotate90?: boolean
  size?: string
  spin?: boolean
  style?: Record<string, any>
  textAlign?: boolean
}

interface IconProps extends Props {
  Icon: React.ElementType
}

interface IconPropsWithText extends Props {
  Icon: React.ElementType
  children: React.ReactNode
}

const getFontSize = (size?: string) => {
  switch (size) {
    case '1.5x':
      return '1.5em'
    case '2x':
      return '2em'
    case '3x':
      return '3em'
    case '4x':
      return '4em'
    case '5x':
      return '5em'
    default:
      return 'inherit'
  }
}

const rotateAnimation = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`

export const StyledIconWrapper = styled.span<Props>`
  animation: ${(props) => (props.spin ? rotateAnimation : 'none')} 1s linear
    infinite;
  display: ${(props) => (props.spin ? 'block' : 'initial')};
  ${StyledIconBase} {
    width: 1em;
    height: 1em;
    font-size: ${(props) => getFontSize(props.size)};
    transform: ${(props) => `
      ${props.flipHorizontal ? 'scale(-1,1) ' : ''}
      ${props.rotate90 ? 'rotate(90deg)' : ''}
      `};
  }
`

export const StyledIconWrapperTextAlign = styled(StyledIconWrapper)<Props>`
  ${StyledIconBase} {
    margin: -0.125em 0;
    vertical-align: baseline;
  }
  &:after {
    margin: 0 0.125em;
    content: '';
  }
`

const IconButton = styled.div`
  display: flex;
  gap: 5px;
`

export const IconWithText = ({
  children,
  Icon,
  size,
  spin
}: IconPropsWithText): React.ReactElement => {
  return (
    <IconButton>
      <StyledIconWrapperTextAlign size={size} spin={spin}>
        <Icon />
      </StyledIconWrapperTextAlign>
      <span>{children}</span>
    </IconButton>
  )
}

export const Icon = ({ Icon, ...props }: IconProps): React.ReactElement => (
  <StyledIconWrapper {...props}>
    <Icon />
  </StyledIconWrapper>
)
