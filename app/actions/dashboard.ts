"use server"

export async function getDashboardStats() {
    // Return empty stats to prevent crash
    return {
        totalApplications: 0,
        recentActivity: []
    }
}
