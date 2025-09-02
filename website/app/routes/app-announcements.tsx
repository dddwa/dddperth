import { CACHE_CONTROL } from '~/lib/http.server'

export interface GoogleFormUpdates {
    Timestamp: string
    Message: string
}

/** This route is used by the app for on the day announcements */
export async function loader() {
    // const apiKey = process.env.GOOGLE_FORMS_API_KEY
    // const fileId = process.env.GOOGLE_FORMS_FILE_ID
    // if (!apiKey || !fileId) {
    //     return new Response(JSON.stringify({ message: 'No Google Forms API key or form ID' }), { status: 404 })
    // }

    // try {
    //     const BASE_URL = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`

    //     const response = await fetch(BASE_URL, {
    //         headers: {
    //             'Content-Type': 'application/json',
    //             Accept: 'application/json',
    //         },
    //     })

    //     const responseData = (await response.json()) as GoogleFormUpdates[]

    //     const announcementData = responseData
    //         .map((row) => {
    //             return { createdTime: row.Timestamp, update: row.Message }
    //         })
    //         .sort((a, b) => {
    //             return new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime()
    //         })

    //     return json(announcementData, {
    //         headers: {
    //             'Cache-Control': CACHE_CONTROL.announce,
    //             'Access-Control-Allow-Origin': '*',
    //         },
    //     })
    // } catch (err) {
    //     trace.getActiveSpan()?.recordException(resolveError(err))
    //     return json([], {
    //         headers: {
    //             'Cache-Control': CACHE_CONTROL.announce,
    //             'Access-Control-Allow-Origin': '*',
    //         },
    //     })
    // }

    return new Response(
        JSON.stringify([
            {
                createdTime: new Date().toISOString(),
                update: 'Get your 2024 Yearbook from the Info Desk!',
            },
        ]),
        {
            headers: {
                'Cache-Control': CACHE_CONTROL.announce,
                'Access-Control-Allow-Origin': '*',
            },
        },
    )
}
