import type { ReactNode } from 'react'
import { SpeakerModal } from '~/components/speaker-modal'
import type { RunsheetSessionDetail } from '~/lib/runsheets/runsheet-session.server'
import { styled } from '~/styled-system/jsx'

/**
 * A run sheet talk's details: the session as Sessionize has it, and what its
 * speakers told us through the portal about running it. The page loads
 * `detail` on demand when a talk is opened.
 */
export function RunsheetSessionModal({
    title,
    when,
    where,
    loading,
    detail,
    onClose,
}: {
    /** Null when closed. */
    title: string | null
    when: string
    where: string
    loading: boolean
    /** Null once loaded means the details couldn't be fetched. */
    detail: RunsheetSessionDetail | null | undefined
    onClose: () => void
}) {
    return (
        <SpeakerModal title={title ?? ''} open={title !== null} onOpenChange={(open) => !open && onClose()}>
            <styled.p fontSize="sm" mb="4">
                {when}
                {where ? ` · ${where}` : ''}
            </styled.p>
            {loading ? (
                <styled.p role="status">Loading session details…</styled.p>
            ) : !detail ? (
                <styled.p role="alert">Couldn&apos;t load this session&apos;s details. Try again shortly.</styled.p>
            ) : (
                <SessionDetail detail={detail} />
            )}
        </SpeakerModal>
    )
}

function SessionDetail({ detail }: { detail: RunsheetSessionDetail }) {
    const { running, speakers } = detail

    return (
        <styled.div display="grid" gap="3">
            <Section heading="Info">
                {running ? (
                    <Details
                        rows={[
                            ['Questions', running.questions],
                            ['Presentation needs', running.presentationNeeds.join(', ') || null],
                        ]}
                    />
                ) : (
                    <p>The speakers haven&apos;t filled in their session details yet.</p>
                )}
            </Section>

            <Section heading="Intro">
                {speakers.map((speaker) => (
                    <div key={speaker.name}>
                        <p>
                            <SpeakerName speaker={speaker} />
                            {speaker.pronunciation ? ` (${speaker.pronunciation})` : ''}
                        </p>
                        <styled.p whiteSpace="pre-line">{speaker.introduction ?? 'No intro provided yet.'}</styled.p>
                    </div>
                ))}
            </Section>

            <Section heading="Session Details">
                {detail.description ? <styled.p whiteSpace="pre-line">{detail.description}</styled.p> : null}
                <Details rows={detail.categories.map((category): Row => [category.name, category.items.join(', ')])} />
                {speakers.map((speaker) => (
                    <div key={speaker.name}>
                        <p>
                            <SpeakerName speaker={speaker} />
                        </p>
                        {speaker.tagLine ? <p>{speaker.tagLine}</p> : null}
                        {speaker.bio ? <styled.p whiteSpace="pre-line">{speaker.bio}</styled.p> : null}
                    </div>
                ))}
            </Section>
        </styled.div>
    )
}

/** The speaker's name in bold, with their pronouns after it when given. */
function SpeakerName({ speaker }: { speaker: RunsheetSessionDetail['speakers'][number] }) {
    return (
        <>
            <strong>{speaker.name}</strong>
            {speaker.pronouns ? ` (${speaker.pronouns})` : ''}
        </>
    )
}

/** Collapsed by default, so the modal opens as a short list of what's in it. */
function Section({ heading, children }: { heading: string; children: ReactNode }) {
    return (
        <styled.details border="admin-subtle" borderRadius="md" p="3">
            <styled.summary fontWeight="semibold" cursor="pointer">
                {heading}
            </styled.summary>
            <styled.div display="grid" gap="2" mt="2">
                {children}
            </styled.div>
        </styled.details>
    )
}

type Row = [string, string | null]

/** A term/value list, dropping rows with nothing to say. */
function Details({ rows }: { rows: Row[] }) {
    const shown = rows.filter((row): row is [string, string] => !!row[1])
    if (shown.length === 0) return null
    return (
        <styled.dl display="grid" gridTemplateColumns="[max-content 1fr]" columnGap="4" rowGap="1">
            {shown.map(([term, value]) => (
                <DetailsRow key={term} term={term} value={value} />
            ))}
        </styled.dl>
    )
}

function DetailsRow({ term, value }: { term: string; value: string }) {
    return (
        <>
            <styled.dt fontWeight="medium">{term}</styled.dt>
            <styled.dd whiteSpace="pre-line">{value}</styled.dd>
        </>
    )
}
