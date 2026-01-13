export default function AdminInterviewsPage() {
    return (
        <div className="p-8 max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold mb-8 text-gray-800">Interview Scheduling</h1>
            <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
                <p className="text-gray-500">Upcoming AI interviews and candidate responses will be listed here.</p>
                <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                    Schedule Interview
                </button>
            </div>
        </div>
    );
}
