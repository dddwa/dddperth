import { Hero } from '../components/hero/hero'
import { SkipToContent } from '../components/skip-to-content'

// export const headers: HeadersFunction = () => {
//     return { 'Cache-Control': CACHE_CONTROL.DEFAULT }
// }

export default function Index() {
    return (
        <>
            <SkipToContent />
            <Hero />
        </>
    )
}
