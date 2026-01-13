
import { useMemo } from 'react';

interface DashboardOverviewProps {
    applications: any[];
}

export default function DashboardOverview({ applications }: DashboardOverviewProps) {
    const stats = useMemo(() => {
        const total = applications.length;
        const shortlisted = applications.filter(a => ['SHORTLISTED', 'EXAM_ASSIGNED', 'EXAM_PASSED', 'INTERVIEW_SCHEDULED'].includes(a.status)).length;
        const interview = applications.filter(a => ['INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED'].includes(a.status)).length;
        const hired = applications.filter(a => a.status === 'HIRED').length;
        const rejected = applications.filter(a => ['REJECTED', 'EXAM_FAILED'].includes(a.status)).length;

        return { total, shortlisted, interview, hired, rejected };
    }, [applications]);

    // Simple funnel calculation
    const funnelData = [
        { label: 'Applied', count: stats.total, color: 'bg-blue-500' },
        { label: 'Shortlisted', count: stats.shortlisted, color: 'bg-indigo-500' },
        { label: 'Interview', count: stats.interview, color: 'bg-purple-500' },
        { label: 'Hired', count: stats.hired, color: 'bg-green-500' }
    ];

    const maxCount = Math.max(...funnelData.map(d => d.count)) || 1;

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
                    <div>
                        <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">Total Applications</p>
                        <h3 className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</h3>
                    </div>
                    <div className="mt-4 flex items-center text-sm text-green-600">
                        <span className="font-bold">100%</span>
                        <span className="ml-2 text-gray-400">of pool</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
                    <div>
                        <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">Shortlisted</p>
                        <h3 className="text-3xl font-bold text-indigo-600 mt-2">{stats.shortlisted}</h3>
                    </div>
                    <div className="mt-4 flex items-center text-sm">
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${(stats.shortlisted / stats.total * 100) || 0}%` }}></div>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
                    <div>
                        <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">Interviews</p>
                        <h3 className="text-3xl font-bold text-purple-600 mt-2">{stats.interview}</h3>
                    </div>
                    <div className="mt-4 text-sm text-gray-500">
                        Active Candidates
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
                    <div>
                        <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">Hired</p>
                        <h3 className="text-3xl font-bold text-green-600 mt-2">{stats.hired}</h3>
                    </div>
                    <div className="mt-4 flex items-center text-sm text-green-600 bg-green-50 px-2 py-1 object-contain w-fit rounded">
                        <span>Success</span>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Visual Funnel */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h4 className="text-lg font-bold text-gray-800 mb-6">Hiring Funnel</h4>
                    <div className="space-y-4">
                        {funnelData.map((stage) => (
                            <div key={stage.label}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="font-medium text-gray-700">{stage.label}</span>
                                    <span className="text-gray-500">{stage.count}Candidates</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-lg h-4 overflow-hidden relative">
                                    <div
                                        className={`h-full ${stage.color} transition-all duration-1000 ease-out`}
                                        style={{ width: `${(stage.count / maxCount) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-6 text-center">Conversion rate from App to Hire: {((stats.hired / stats.total) * 100).toFixed(1)}%</p>
                </div>

                {/* Status Distribution (Pie-ish Grid) */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h4 className="text-lg font-bold text-gray-800 mb-6">Status Breakdown</h4>
                    <div className="grid grid-cols-2 gap-4">
                        {Object.entries(applications.reduce((acc: any, curr) => {
                            const s = curr.status;
                            acc[s] = (acc[s] || 0) + 1;
                            return acc;
                        }, {})).map(([status, count]: any) => (
                            <div key={status} className="p-4 bg-gray-50 rounded-lg border border-gray-200 flex flex-col items-center">
                                <span className="text-2xl font-bold text-gray-800">{count}</span>
                                <span className="text-xs font-medium text-gray-500 uppercase mt-1 text-center">{status.replace(/_/g, ' ')}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Activity Mini-Feed */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h4 className="text-lg font-bold text-gray-800 mb-4">Recent Activity</h4>
                <div className="flow-root">
                    <ul className="-mb-8">
                        {applications.slice(0, 5).map((app, appIdx) => (
                            <li key={app.id}>
                                <div className="relative pb-8">
                                    {appIdx !== applications.length - 1 ? (
                                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                                    ) : null}
                                    <div className="relative flex space-x-3">
                                        <div>
                                            <span className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center ring-8 ring-white">
                                                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                            </span>
                                        </div>
                                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                            <div>
                                                <p className="text-sm text-gray-500">New application from <a href="#" className="font-medium text-gray-900">{app.full_name}</a></p>
                                            </div>
                                            <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                                <time dateTime={app.created_at}>{new Date(app.created_at).toLocaleDateString()}</time>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
