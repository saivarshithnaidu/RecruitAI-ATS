import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Globe, Smartphone, MousePointer2, ArrowUpRight, Tablet } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function InviteAnalyticsPage() {
    const { data: clicks, error } = await supabaseAdmin
        .from('invite_clicks')
        .select('*')
        .order('clicked_at', { ascending: false });

    if (error) {
        return (
            <div className="p-8">
                <div className="bg-red-50 text-red-600 p-4 rounded-md border border-red-200">
                    <h2 className="font-semibold">Error loading analytics</h2>
                    <p>{error.message}</p>
                </div>
            </div>
        );
    }

    const totalClicks = clicks?.length || 0;

    // Aggregation Logic
    const countries: Record<string, number> = {};
    const cities: Record<string, number> = {};
    const devices: Record<string, number> = {};
    const referrers: Record<string, number> = {};

    clicks?.forEach(click => {
        const country = click.country || 'Unknown';
        countries[country] = (countries[country] || 0) + 1;

        const city = click.city || 'Unknown';
        cities[city] = (cities[city] || 0) + 1;

        const device = click.device || 'Unknown';
        devices[device] = (devices[device] || 0) + 1;

        let referrer = click.referrer || 'Direct';
        if (referrer.includes('whatsapp')) referrer = 'WhatsApp';
        else if (referrer.includes('linkedin')) referrer = 'LinkedIn';
        else if (referrer.includes('google')) referrer = 'Google';
        else if (referrer.includes('facebook')) referrer = 'Facebook';
        else if (referrer.includes('t.co') || referrer.includes('twitter')) referrer = 'Twitter';
        else if (!referrer.startsWith('http')) referrer = 'Direct';

        referrers[referrer] = (referrers[referrer] || 0) + 1;
    });

    const getTop = (obj: Record<string, number>, limit = 5) =>
        Object.entries(obj)
            .sort(([, a], [, b]) => b - a)
            .slice(0, limit);

    const StatCard = ({ title, value, subtext, icon: Icon, colorClass }: any) => (
        <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                <div className={`p-2 rounded-full ${colorClass} bg-opacity-20`}>
                    <Icon className={`h-4 w-4 ${colorClass.replace('bg-', 'text-')}`} />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
            </CardContent>
        </Card>
    );

    const ListRow = ({ label, value, total, index }: any) => {
        const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
        return (
            <div className="space-y-1 py-1">
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-700">{label}</span>
                    </div>
                    <span className="text-muted-foreground">{value} <span className="text-xs text-gray-400 ml-1">({percentage}%)</span></span>
                </div>
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-blue-600 rounded-full"
                        style={{ width: `${percentage}%`, opacity: Math.max(0.3, 1 - index * 0.1) }}
                    />
                </div>
            </div>
        );
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Invite Analytics</h1>
                    <p className="text-muted-foreground mt-1 text-sm bg-gray-100 w-fit px-2 py-0.5 rounded-full">Pro Tracking Active</p>
                </div>
                <div className="flex gap-2">
                    {/* Add actions if needed later */}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Total Clicks"
                    value={totalClicks}
                    subtext="All time unique visits"
                    icon={MousePointer2}
                    colorClass="bg-blue-100 text-blue-600"
                />
                <StatCard
                    title="Top Country"
                    value={getTop(countries, 1)[0]?.[0] || 'N/A'}
                    subtext={`${getTop(countries, 1)[0]?.[1] || 0} visits`}
                    icon={Globe}
                    colorClass="bg-green-100 text-green-600"
                />
                <StatCard
                    title="Top Device"
                    value={getTop(devices, 1)[0]?.[0] || 'N/A'}
                    subtext={`${getTop(devices, 1)[0]?.[1] || 0} visits`}
                    icon={Smartphone}
                    colorClass="bg-purple-100 text-purple-600"
                />
                <StatCard
                    title="Top Source"
                    value={getTop(referrers, 1)[0]?.[0] || 'N/A'}
                    subtext={`${getTop(referrers, 1)[0]?.[1] || 0} visits`}
                    icon={Users}
                    colorClass="bg-orange-100 text-orange-600"
                />
            </div>

            {/* Detailed Lists */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card className="col-span-1 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg">Top Countries</CardTitle>
                        <CardDescription>Geographic distribution of clicks</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {getTop(countries, 6).map(([country, count], i) => (
                            <ListRow key={country} label={country} value={count} total={totalClicks} index={i} />
                        ))}
                        {Object.keys(countries).length === 0 && <p className="text-sm text-muted-foreground italic">No data recorded.</p>}
                    </CardContent>
                </Card>

                <Card className="col-span-1 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg">Top Cities</CardTitle>
                        <CardDescription>City-level breakdown</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {getTop(cities, 6).map(([city, count], i) => (
                            <ListRow key={city} label={city} value={count} total={totalClicks} index={i} />
                        ))}
                        {Object.keys(cities).length === 0 && <p className="text-sm text-muted-foreground italic">No data recorded.</p>}
                    </CardContent>
                </Card>

                <Card className="col-span-1 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg">Sources & Devices</CardTitle>
                        <CardDescription>Platform and referrer insights</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Referrers</h4>
                            <div className="space-y-3">
                                {getTop(referrers, 4).map(([ref, count], i) => (
                                    <ListRow key={ref} label={ref} value={count} total={totalClicks} index={i} />
                                ))}
                            </div>
                        </div>
                        <div>
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Devices</h4>
                            <div className="space-y-3">
                                {getTop(devices, 3).map(([device, count], i) => (
                                    <ListRow key={device} label={device} value={count} total={totalClicks} index={i} />
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Clicks Table */}
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        Recent Activity
                        <span className="text-xs font-normal text-muted-foreground bg-gray-100 px-2 py-0.5 rounded-full">Last 10 Clicks</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <div className="grid grid-cols-12 gap-4 border-b bg-gray-50/50 p-3 text-xs font-medium text-muted-foreground">
                            <div className="col-span-3">IP Address</div>
                            <div className="col-span-3">Location</div>
                            <div className="col-span-3">Source</div>
                            <div className="col-span-3 text-right">Time</div>
                        </div>
                        <div className="divide-y">
                            {clicks?.slice(0, 10).map((click) => (
                                <div key={click.id} className="grid grid-cols-12 gap-4 p-3 text-sm hover:bg-gray-50 transition-colors">
                                    <div className="col-span-3 font-mono text-xs text-gray-500 truncate">{click.ip_address}</div>
                                    <div className="col-span-3 truncate flex items-center gap-1">
                                        <span className="font-medium text-gray-700">{click.country}</span>
                                        <span className="text-gray-400">, {click.city}</span>
                                    </div>
                                    <div className="col-span-3 text-gray-600 truncate">
                                        <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                                            {click.referrer}
                                        </span>
                                    </div>
                                    <div className="col-span-3 text-right text-xs text-gray-500 tabular-nums">
                                        {new Date(click.clicked_at).toLocaleString()}
                                    </div>
                                </div>
                            ))}
                            {(!clicks || clicks.length === 0) && (
                                <div className="p-8 text-center text-muted-foreground text-sm">
                                    No activity recorded yet. Send out an invite link to get started.
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
