/* Copyright Contributors to the Open Cluster Management project */
/* eslint-disable @typescript-eslint/ban-ts-comment -- test fixtures omit full control graph props */
// @ts-nocheck — test fixtures omit full control graph props

import EditorHeader from './EditorHeader'
import { render } from '@testing-library/react'

const type = 'application'
const otherYAMLTabs: { id: string }[] = []
const handleTabChange = jest.fn()

describe('EditorHeader component', () => {
  it('renders as expected', () => {
    const fn = jest.fn((key: string) => key)
    const Component = () => {
      return (
        <EditorHeader
          handleEditorCommand={fn}
          otherYAMLTabs={otherYAMLTabs}
          handleTabChange={handleTabChange}
          type={type}
          i18n={fn}
          title=""
        />
      )
    }
    const { asFragment } = render(<Component />)
    expect(asFragment()).toMatchSnapshot()
  })
})
