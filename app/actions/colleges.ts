"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type College = {
    id: string;
    name: string;
    city: string;
    district: string;
    university: string;
};

export async function searchColleges(query: string, district?: string): Promise<College[]> {
    // If query is short but district is selected, we might want to return top colleges in that district?
    // For now, require 2 chars for search unless it's a "load all for district" which we might not want due to volume.
    // Let's stick to search + filter.

    let dbQuery = supabaseAdmin
        .from('colleges')
        .select('id, name, city, district, university')
        .eq('status', 'active')
        .limit(50); // Increased limit

    if (query && query.length >= 2) {
        dbQuery = dbQuery.ilike('name', `%${query}%`);
    }

    if (district && district !== 'All') {
        dbQuery = dbQuery.eq('district', district);
    }

    // Require either a query OR a district to avoid dumping whole DB
    if ((!query || query.length < 2) && (!district || district === 'All')) {
        return [];
    }

    const { data, error } = await dbQuery;

    if (error) {
        console.error("Error searching colleges:", error);
        return [];
    }

    return data || [];
}

export async function getCollegesStats() {
    const { data, error } = await supabaseAdmin
        .from('colleges')
        .select('*')
        .order('name');

    if (error) {
        console.error("Error fetching college stats:", error);
        return [];
    }
    return data;
}

export async function toggleCollegeStatus(id: string, status: 'active' | 'inactive') {
    const { error } = await supabaseAdmin
        .from('colleges')
        .update({ status })
        .eq('id', id);

    if (error) {
        console.error("Error toggling college status:", error);
        return { success: false, message: error.message };
    }
    return { success: true };
}

export async function addNewCollege(data: Partial<College>) {
    const { error } = await supabaseAdmin
        .from('colleges')
        .insert([{ ...data, status: 'active' }]);

    if (error) {
        console.error("Error adding college:", error);
        return { success: false, message: error.message };
    }
    return { success: true };
}
