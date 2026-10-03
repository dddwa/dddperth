// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { TalkRecording } from './talk-recording'

afterEach(cleanup)

describe('TalkRecording', () => {
    it('embeds the video with a title naming the talk', () => {
        render(<TalkRecording videoId="xiP9BFeg0aM" talkTitle="Open Observability" />, { wrapper: MemoryRouter })

        const frame = screen.getByTitle('Recording: Open Observability')
        expect(frame.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/xiP9BFeg0aM')
        expect(screen.getByRole('region', { name: 'Recording' })).toBeTruthy()
    })

    it('links to the video on YouTube', () => {
        render(<TalkRecording videoId="xiP9BFeg0aM" talkTitle="Open Observability" />, { wrapper: MemoryRouter })

        expect(screen.getByRole('link', { name: /Watch on YouTube/ }).getAttribute('href')).toBe(
            'https://www.youtube.com/watch?v=xiP9BFeg0aM',
        )
    })
})
