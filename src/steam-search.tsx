import { Grid, ActionPanel, Action, Detail, Icon } from "@raycast/api";
import { useState, useEffect } from "react";

export default function Command() {
    const [searchText, setSearchText] = useState("");
    const [items, setItems] = useState<{ id: string; name: string; image: string; price?: string }[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        async function fetchGames() {
            if (searchText.length < 2) {
                setItems([]);
                return;
            }

            setIsLoading(true);
            try {
                const response = await fetch(
                    `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(searchText)}&l=english&cc=US`
                );
                const data = (await response.json()) as any;

                if (data && data.items) {
                    setItems(
                        data.items.map((item: any) => ({
                            id: item.id.toString(),
                            name: item.name,
                            // Vi använder Cloudflare-URL:en här för Grid-vyn
                            image: `https://cdn.cloudflare.steamstatic.com/steam/apps/${item.id}/header.jpg`,
                            price: item.price ? `$${item.price.final / 100}` : "Free to Play",
                        }))
                    );
                }
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchGames();
    }, [searchText]);

    return (
        <Grid
            isLoading={isLoading}
            onSearchTextChange={setSearchText}
            searchBarPlaceholder="Search games on Steam..."
            throttle
            columns={3}
            aspectRatio="16/9"
            fit={Grid.Fit.Fill}
        >
            {items.map((item) => (
                <Grid.Item
                    key={item.id}
                    content={{ value: item.image, fallback: Icon.GameController }}
                    title={item.name}
                    subtitle={item.price}
                    actions={
                        <ActionPanel>
                            <Action.Push
                                title="View Details"
                                icon={Icon.Sidebar}
                                target={<GameDetail appId={item.id} name={item.name} image={item.image} price={item.price} />}
                            />
                            <Action.OpenInBrowser title="Open in Browser" url={`https://store.steampowered.com/app/${item.id}`} />
                            <Action.OpenInBrowser title="Open in Steam App" url={`steam://store/${item.id}`} />
                        </ActionPanel>
                    }
                />
            ))}
        </Grid>
    );
}

function GameDetail({ appId, name, image, price }: { appId: string; name: string; image: string; price?: string }) {
    const [details, setDetails] = useState<{
        description: string;
        reviews: string;
        developer: string;
        publisher: string;
        releaseDate: string;
        genres: string;
        pcRequirements?: string;
    } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchDetails() {
            try {
                const response = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}`);
                const data = (await response.json()) as any;

                if (data[appId].success) {
                    const gameData = data[appId].data;
                    setDetails({
                        description: gameData.short_description?.replace(/<[^>]*>?/gm, "") || "No description available.",
                        reviews: gameData.recommendations ? `${gameData.recommendations.total.toLocaleString()} recommendations` : "N/A",
                        developer: gameData.developers ? gameData.developers.join(", ") : "N/A",
                        publisher: gameData.publishers ? gameData.publishers.join(", ") : "N/A",
                        releaseDate: gameData.release_date?.date || "TBA",
                        genres: gameData.genres ? gameData.genres.map((g: any) => g.description).join(", ") : "N/A",
                        pcRequirements: gameData.pc_requirements?.minimum?.replace(/<[^>]*>?/gm, " "),
                    });
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        }
        fetchDetails();
    }, [appId]);

    const markdown = `
# ${name}
![Header](${image})

### Description
${details?.description || "Loading..."}

${details?.pcRequirements ? `---\n### Minimum System Requirements\n${details.pcRequirements}` : ""}
  `;

    return (
        <Detail
            isLoading={loading}
            markdown={markdown}
            navigationTitle={name}
            metadata={
                <Detail.Metadata>
                    <Detail.Metadata.Label title="Price" text={price} />
                    <Detail.Metadata.Label title="Release Date" text={details?.releaseDate || "Loading..."} />
                    <Detail.Metadata.Separator />
                    <Detail.Metadata.Label title="Developer" text={details?.developer || "Loading..."} />
                    <Detail.Metadata.Label title="Publisher" text={details?.publisher || "Loading..."} />
                    <Detail.Metadata.Label title="Genres" text={details?.genres || "Loading..."} />
                    <Detail.Metadata.Separator />
                    <Detail.Metadata.Label
                        title="Community Score"
                        text={details?.reviews || "Loading..."}
                        icon={Icon.Star}
                    />
                    <Detail.Metadata.Separator />
                    <Detail.Metadata.Link
                        title="Store Page"
                        target={`https://store.steampowered.com/app/${appId}`}
                        text="Open in Browser"
                    />
                    <Detail.Metadata.Link
                        title="Store Page"
                        target={`steam://store/${appId}`}
                        text="Open in Steam Client"
                    />
                    <Detail.Metadata.Link
                        title="Store Page"
                        target={`https://steamdb.info/app/${appId}/`}
                        text="View on SteamDB"
                    />
                </Detail.Metadata>
            }
            actions={
                <ActionPanel>
                    <Action.OpenInBrowser title="Open in Browser" url={`https://store.steampowered.com/app/${appId}`} />
                    <Action.OpenInBrowser title="Open in Steam App" url={`steam://store/${appId}`} />
                    <Action.CopyToClipboard title="Copy App ID" content={appId} />
                </ActionPanel>
            }
        />
    );
}