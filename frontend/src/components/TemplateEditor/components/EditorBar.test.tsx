/* Copyright Contributors to the Open Cluster Management project */
/* eslint-disable @typescript-eslint/ban-ts-comment -- test fixtures omit full control graph props */
// @ts-nocheck — test fixtures omit full control graph props

import EditorBar from './EditorBar'
import { render } from '@testing-library/react'

describe('EditorBar component', () => {
  it('renders as expected', () => {
    const fn = jest.fn()
    const Component = () => {
      return (
        <EditorBar
          hasUndo={false}
          hasRedo={true}
          title="YAML"
          type="main"
          handleEditorCommand={fn}
          handleSearchChange={fn}
          i18n={fn}
        />
      )
    }
    const { asFragment } = render(<Component />)
    expect(asFragment()).toMatchSnapshot()
  })
})
