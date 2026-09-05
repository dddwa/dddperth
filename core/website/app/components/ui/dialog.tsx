import { Dialog } from '@ark-ui/react/dialog'
import { styled } from '~/styled-system/jsx'

// Same underlying Ark UI Dialog machine as `./drawer.tsx` — that one is
// styled as a slide-in side panel (mobile nav), this one as a centered
// modal card. Styles are inlined at each call site rather than a shared
// recipe, matching the rationale already documented in drawer.tsx.
export const Root = Dialog.Root
export const Trigger = styled(Dialog.Trigger)
export const CloseTrigger = styled(Dialog.CloseTrigger)
export const Backdrop = styled(Dialog.Backdrop)
export const Positioner = styled(Dialog.Positioner)
export const Content = styled(Dialog.Content)
export const Title = styled(Dialog.Title)
export const Description = styled(Dialog.Description)
