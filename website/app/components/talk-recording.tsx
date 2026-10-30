import { AppLink } from '~/components/app-link'
import { styled } from '~/styled-system/jsx'

export function TalkRecording({ videoId, talkTitle }: { videoId: string; talkTitle: string }) {
    const id = encodeURIComponent(videoId)

    return (
        <styled.section aria-labelledby="talk-recording-heading" mb="5">
            <styled.h3 id="talk-recording-heading" fontSize="md" fontWeight="semibold" mb="3">
                Recording
            </styled.h3>
            <styled.div aspectRatio="wide" w="full">
                {/* youtube-nocookie defers YouTube's tracking cookies until the viewer presses play. The
                    referrer policy is pinned because YouTube refuses to play embeds sent without one, so a
                    site-wide no-referrer policy added later would otherwise break every recording. */}
                <styled.iframe
                    src={`https://www.youtube-nocookie.com/embed/${id}`}
                    title={`Recording: ${talkTitle}`}
                    w="full"
                    h="full"
                    border="none"
                    loading="lazy"
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                />
            </styled.div>
            <AppLink
                unstyled
                to={`https://www.youtube.com/watch?v=${id}`}
                display="inline-block"
                pt="2"
                color="text.highlight"
                textDecoration="underline"
            >
                Watch on YouTube
            </AppLink>
        </styled.section>
    )
}
