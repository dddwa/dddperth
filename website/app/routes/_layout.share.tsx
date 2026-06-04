import { useEffect, useState } from "react";
import { Divider, Flex, styled } from "~/styled-system/jsx";

type Registration = {
    name?: string;
    tickets?: Array<{ name?: string; first_name?: string; last_name?: string }>;
};

type State =
    | { kind: "loading" }
    | { kind: "no-slug" }
    | { kind: "error"; message: string }
    | { kind: "ready"; registration: Registration };

function base64EncodeUtf8(input: string) {
    const bytes = new TextEncoder().encode(input);
    let binary = "";
    for (const b of bytes) binary += String.fromCharCode(b);
    return btoa(binary);
}

function hashString(input: string): number {
    let hash = 5381;
    for (let i = 0; i < input.length; i++) {
        hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
}

function hslToHex(h: number, s: number, l: number): string {
    const sNorm = s / 100;
    const lNorm = l / 100;
    const a = sNorm * Math.min(lNorm, 1 - lNorm);
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = lNorm - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
        return Math.round(255 * color)
            .toString(16)
            .padStart(2, "0")
            .toUpperCase();
    };
    return `${f(0)}${f(8)}${f(4)}`;
}

function colorsFromName(userName: string): [string, string, string] {
    const baseHue = hashString(userName || "anon") % 360;
    const saturation = 70;
    const lightness = 60;
    return [
        hslToHex(baseHue, saturation, lightness),
        hslToHex((baseHue + 120) % 360, saturation, lightness),
        hslToHex((baseHue + 240) % 360, saturation, lightness),
    ];
}

function buildShareUrl(userName: string) {
    const [screenColor1, screenColor2, screenColor3] = colorsFromName(userName);
    const payload = {
        userData: {
            userName,
            operatingSystem: 0,
            screenColor1,
            screenColor2,
            screenColor3,
        },
    };

    const encoded = encodeURIComponent(base64EncodeUtf8(JSON.stringify(payload)));
    // const url = new URL("https://ddd-2026.sharecast.io/");
    const url = new URL("http://localhost:1152/");
    url.hash = `data=${encoded}`;
    return url.toString();
}

export default function Share() {
    const [state, setState] = useState<State>({ kind: "loading" });

    useEffect(() => {
        const stashed = localStorage.getItem("tito:registration");
        if (!stashed) {
            setState({ kind: "no-slug" });
            return;
        }

        let slug: string | undefined;
        try {
            slug = JSON.parse(stashed).slug;
        } catch {
            setState({ kind: "no-slug" });
            return;
        }
        if (!slug) {
            setState({ kind: "no-slug" });
            return;
        }

        const controller = new AbortController();
        fetch("/api/tito-registration", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slug }),
            signal: controller.signal,
        })
            .then(async (res) => {
                const body = await res.json();
                if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
                setState({ kind: "ready", registration: body.registration });
            })
            .catch((err) => {
                if (controller.signal.aborted) return;
                setState({
                    kind: "error",
                    message: err instanceof Error ? err.message : String(err),
                });
            });

        return () => controller.abort();
    }, []);

    if (state.kind === "loading") return <p className="c_white">Loading your registration…</p>;
    if (state.kind === "no-slug")
        return (
            <p className="c_white">
                No registration found. Please complete a ticket purchase first.
            </p>
        );
    if (state.kind === "error")
        return <p className="c_white">Couldn’t load registration: {state.message}</p>;

    return <ShareReady registration={state.registration} />;
}

function ShareReady({ registration }: { registration: Registration }) {
    const tickets = registration.tickets ?? [];
    const [selectedIdx, setSelectedIdx] = useState(0);

    const selected = tickets[selectedIdx];
    const userName = selected?.name ?? registration.name ?? "";

    return (
        <styled.div mx={{ base: "5", md: "auto" }} mt="5vh" maxW="555px">
            {tickets.length > 1 && (
                <styled.fieldset border="none" p="0" m="0" mb="4">
                    <styled.legend color="white" fontWeight="semibold" mb="2">
                        Select a ticket
                    </styled.legend>
                    <Flex direction="column" gap="2">
                        {tickets.map((ticket, idx) => (
                            <styled.label
                                key={idx}
                                display="flex"
                                alignItems="center"
                                gap="2"
                                color="white"
                                cursor="pointer"
                            >
                                <input
                                    type="radio"
                                    name="ticket"
                                    value={idx}
                                    checked={idx === selectedIdx}
                                    onChange={() => setSelectedIdx(idx)}
                                />
                                <span>{ticket.name ?? `Ticket ${idx + 1}`}</span>
                            </styled.label>
                        ))}
                    </Flex>
                </styled.fieldset>
            )}

            {tickets.length > 1 && <Divider color="#8D8DFF33" my="6" />}

            <styled.iframe
                src={buildShareUrl(userName)}
                title="Generate your share image"
                w="100%"
                h={{ base: "60dvh", xl: "80dvh" }}
                border="none"
                allow="web-share"
            />
        </styled.div>
    );
}
