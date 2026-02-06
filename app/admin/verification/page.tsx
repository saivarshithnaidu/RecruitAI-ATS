import { getPendingPhotos, verifyPhoto, rejectPhoto } from "@/app/actions/admin-verification";
import { revalidatePath } from "next/cache";

export const dynamic = 'force-dynamic';

export default async function PhotoVerificationPage() {
    const pendingPhotos = await getPendingPhotos();

    async function handleVerify(formData: FormData) {
        "use server";
        const userId = formData.get('userId') as string;
        await verifyPhoto(userId);
    }

    async function handleReject(formData: FormData) {
        "use server";
        const userId = formData.get('userId') as string;
        const reason = formData.get('reason') as string;
        await rejectPhoto(userId, reason);
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Profile Verification Queue</h1>

            {pendingPhotos.length === 0 ? (
                <div className="bg-white p-8 rounded shadow text-center text-gray-500">
                    No pending photos to verify.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* @ts-ignore */}
                    {pendingPhotos.map((profile) => (
                        <div key={profile.user_id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col">
                            <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4">
                                <img
                                    src={profile.profile_photo_url}
                                    alt={profile.full_name}
                                    className="w-full h-full object-cover"
                                />
                            </div>

                            <div className="mb-4 flex-1">
                                <h3 className="font-bold text-lg text-gray-900">{profile.full_name}</h3>
                                <p className="text-sm text-gray-500 mb-1">{profile.email}</p>
                                <p className="text-xs text-gray-400">Uploaded: {new Date(profile.created_at).toLocaleDateString()}</p>
                            </div>

                            <div className="space-y-3 pt-3 border-t border-gray-100">
                                <form action={handleVerify}>
                                    {/* @ts-ignore */}
                                    <input type="hidden" name="userId" value={profile.user_id} />
                                    <button
                                        type="submit"
                                        className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium transition"
                                    >
                                        Approve Photo
                                    </button>
                                </form>

                                <form action={handleReject} className="space-y-2">
                                    {/* @ts-ignore */}
                                    <input type="hidden" name="userId" value={profile.user_id} />
                                    <input
                                        name="reason"
                                        placeholder="Rejection Reason (e.g. Blurry)"
                                        required
                                        className="w-full text-sm border rounded px-2 py-1"
                                    />
                                    <button
                                        type="submit"
                                        className="w-full py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 font-medium transition text-sm"
                                    >
                                        Reject
                                    </button>
                                </form>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
