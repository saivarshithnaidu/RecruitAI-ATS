
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const COLLEGES_AP = [
    // Universities
    { name: "Andhra University", city: "Visakhapatnam", district: "Visakhapatnam", type: "University", university: "Andhra University" },
    { name: "Jawaharlal Nehru Technological University, Kakinada (JNTUK)", city: "Kakinada", district: "Kakinada", type: "University", university: "JNTUK" },
    { name: "Jawaharlal Nehru Technological University, Anantapur (JNTUA)", city: "Anantapur", district: "Anantapur", type: "University", university: "JNTUA" },
    { name: "Sri Venkateswara University", city: "Tirupati", district: "Tirupati", type: "University", university: "SVU" },
    { name: "Acharya Nagarjuna University", city: "Guntur", district: "Guntur", type: "University", university: "ANU" },
    { name: "Sri Krishnadevaraya University", city: "Anantapur", district: "Anantapur", type: "University", university: "SKU" },
    { name: "Vignan University", city: "Guntur", district: "Guntur", type: "University", university: "Deemed" },
    { name: "GITAM University", city: "Visakhapatnam", district: "Visakhapatnam", type: "University", university: "Deemed" },
    { name: "KL University", city: "Vijayawada", district: "Krishna", type: "University", university: "Deemed" },

    // Engineering Colleges (Sample of Major ones)
    { name: "Gayatri Vidya Parishad College of Engineering (Autonomous)", city: "Visakhapatnam", district: "Visakhapatnam", type: "Engineering", university: "JNTUK" },
    { name: "RVR & JC College of Engineering", city: "Guntur", district: "Guntur", type: "Engineering", university: "ANU" },
    { name: "Vasireddy Venkatadri Institute of Technology (VVIT)", city: "Guntur", district: "Guntur", type: "Engineering", university: "JNTUK" },
    { name: "GMR Institute of Technology", city: "Rajam", district: "Vizianagaram", type: "Engineering", university: "JNTUK" },
    { name: "Maharaj Vijayaram Gajapathi Raj (MVGR) College of Engineering", city: "Vizianagaram", district: "Vizianagaram", type: "Engineering", university: "JNTUK" },
    { name: "Aditya Engineering College", city: "Surampalem", district: "East Godavari", type: "Engineering", university: "JNTUK" },
    { name: "Pragati Engineering College", city: "Surampalem", district: "East Godavari", type: "Engineering", university: "JNTUK" },
    { name: "SRKR Engineering College", city: "Bhimavaram", district: "West Godavari", type: "Engineering", university: "JNTUK" },
    { name: "Vishnu Institute of Technology", city: "Bhimavaram", district: "West Godavari", type: "Engineering", university: "JNTUK" },
    { name: "Shri Vishnu Engineering College for Women", city: "Bhimavaram", district: "West Godavari", type: "Engineering", university: "JNTUK" },
    { name: "G Pulla Reddy Engineering College", city: "Kurnool", district: "Kurnool", type: "Engineering", university: "JNTUA" },
    { name: "N.B.K.R. Institute of Science and Technology", city: "Vidyanagar", district: "Nellore", type: "Engineering", university: "JNTUA" },
    { name: "Madanapalle Institute of Technology and Science", city: "Madanapalle", district: "Annamayya", type: "Engineering", university: "JNTUA" },
    { name: "Sree Vidyanikethan Engineering College", city: "Tirupati", district: "Tirupati", type: "Engineering", university: "JNTUA" },
    { name: "Anil Neerukonda Institute of Technology and Sciences (ANITS)", city: "Visakhapatnam", district: "Visakhapatnam", type: "Engineering", university: "Andhra University" },
    { name: "Raghu Engineering College", city: "Visakhapatnam", district: "Visakhapatnam", type: "Engineering", university: "JNTUK" },
    { name: "Lendi Institute of Engineering and Technology", city: "Vizianagaram", district: "Vizianagaram", type: "Engineering", university: "JNTUK" },
    { name: "Lakireddy Bali Reddy College of Engineering", city: "Mylavaram", district: "Krishna", type: "Engineering", university: "JNTUK" },
    { name: "Prasad V. Potluri Siddhartha Institute of Technology", city: "Vijayawada", district: "Krishna", type: "Engineering", university: "JNTUK" },
    { name: "Velagapudi Ramakrishna Siddhartha Engineering College", city: "Vijayawada", district: "Krishna", type: "Engineering", university: "JNTUK" },

    // Add more as needed or load from larger JSON if available
];

async function seedColleges() {
    console.log(`Seeding ${COLLEGES_AP.length} colleges...`);

    // 1. Process Batch
    const normalizedData = COLLEGES_AP.map(c => ({
        name: c.name,
        state: 'Andhra Pradesh',
        district: c.district,
        city: c.city,
        university: c.university,
        type: c.type,
        status: 'active'
    }));

    // 2. Insert (Upsert based on name + district maybe? or just name)
    // Using name as unique constraint might be risky if different districts have same name college (unlikely for major ones but possible for 'Govt Degree College').
    // Ideally we need a better unique key, but for this seed, we'll just insert if not exists.

    // For upsert, we need a unique constraint. Since we didn't add one in SQL yet (only PK), `upsert` without conflict definition acts like insert or requires unique index.
    // Let's rely on name equality check.

    let added = 0;
    for (const college of normalizedData) {
        const { data: existing } = await supabaseAdmin
            .from('colleges')
            .select('id')
            .eq('name', college.name)
            .eq('district', college.district)
            .maybeSingle();

        if (!existing) {
            const { error } = await supabaseAdmin
                .from('colleges')
                .insert(college);
            if (error) console.error("Error inserting", college.name, error.message);
            else added++;
        }
    }

    console.log(`Seeding complete. Added ${added} new colleges.`);
}

seedColleges();
