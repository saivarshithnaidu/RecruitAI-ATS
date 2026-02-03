"use client";

import { useState, useRef } from "react";
import { useFormStatus } from "react-dom";
import { submitUnifiedApplication } from "@/app/actions/apply";
import { requestPhoneOtp, verifyPhoneOtp } from "@/app/actions/verify";
import { searchColleges } from "@/app/actions/colleges";
import { Combobox } from "@/components/ui/async-combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle, CheckCircle, UploadCloud, Loader2 } from "lucide-react";

// Types
interface ProfileData {
    full_name?: string;
    email?: string;
    phone?: string;
    phone_verified?: boolean;
    address_street?: string;
    address_city?: string;
    address_state?: string;
    address_pincode?: string;
    education?: any;
    skills?: string[] | string;
    preferred_roles?: string[] | string;
}

const AP_COLLEGES = [
    // ... kept for fallback logic if any ...
];

const AP_DISTRICTS = [
    "Srikakulam", "Vizianagaram", "Parvathipuram Manyam", "Alluri Sitharama Raju",
    "Visakhapatnam", "Anakapalli", "Kakinada", "Dr. B.R. Ambedkar Konaseema",
    "East Godavari", "West Godavari", "Eluru", "Krishna", "NTR", "Guntur",
    "Bapatla", "Palnadu", "Prakasam", "Sri Potti Sriramulu Nellore",
    "Kurnool", "Nandyal", "Anantapur", "Sri Sathya Sai", "YSR Kadapa",
    "Annamayya", "Chittoor", "Tirupati"
];

const JOB_ROLES = [
    // ...
    "Software Engineer",
    "Frontend Developer",
    "Backend Developer",
    "Full Stack Developer",
    "Data Analyst",
    "DevOps Engineer",
    "QA Engineer",
    "Intern"
];

function SubmitButton() {
    const { pending } = useFormStatus();

    return (
        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={pending}>
            {pending ? "Submitting Application..." : "Submit Application"}
        </Button>
    );
}

export default function UnifiedApplicationForm({ initialProfile }: { initialProfile?: ProfileData | null }) {
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const formRef = useRef<HTMLFormElement>(null);

    // Initial State Helpers
    const getInitialEdu = () => {
        const edu = initialProfile?.education;
        if (typeof edu === 'string') {
            try { return JSON.parse(edu); } catch { return {}; }
        }
        return edu || {};
    };
    const eduData = getInitialEdu();

    const getInitialSkills = () => {
        if (Array.isArray(initialProfile?.skills)) return initialProfile.skills.join(", ");
        return initialProfile?.skills || "";
    };

    const getInitialRoles = () => {
        if (Array.isArray(initialProfile?.preferred_roles)) return initialProfile.preferred_roles;
        return [];
    };

    // Phone Verification State
    const [phoneVerified, setPhoneVerified] = useState(initialProfile?.phone_verified || false);
    const [phoneInput, setPhoneInput] = useState(initialProfile?.phone || "");
    const [otpSent, setOtpSent] = useState(false);
    const [otp, setOtp] = useState("");
    const [phoneLoading, setPhoneLoading] = useState(false);

    // College State
    const [selectedCollege, setSelectedCollege] = useState<string>(eduData.college || "");
    const [manualCollege, setManualCollege] = useState<boolean>(!eduData.college);
    const [collegeState, setCollegeState] = useState<string>("Andhra Pradesh");
    const [collegeDistrict, setCollegeDistrict] = useState<string>("");

    // Roles State
    const [selectedRoles, setSelectedRoles] = useState<string[]>(getInitialRoles());

    // State for field-level errors
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null);

    async function handleSendOtp() {
        if (!phoneInput || phoneInput.length < 10) {
            setMessage({ type: 'error', text: "Please enter a valid phone number" });
            return;
        }
        setPhoneLoading(true);
        const res = await requestPhoneOtp(phoneInput);
        setPhoneLoading(false);
        if (res.success) {
            setOtpSent(true);
            setMessage({ type: 'success', text: res.message || "OTP Sent" });
        } else {
            setMessage({ type: 'error', text: res.message || "Failed to send OTP" });
        }
    }

    async function handleVerifyOtp() {
        setPhoneLoading(true);
        const res = await verifyPhoneOtp(phoneInput, otp);
        setPhoneLoading(false);
        if (res.success) {
            setPhoneVerified(true);
            setOtpSent(false);
            setMessage({ type: 'success', text: "Phone verified successfully!" });
        } else {
            setMessage({ type: 'error', text: res.message || "Invalid OTP" });
        }
    }

    const toggleRole = (role: string) => {
        if (selectedRoles.includes(role)) {
            setSelectedRoles(prev => prev.filter(r => r !== role));
        } else {
            setSelectedRoles(prev => [...prev, role]);
        }
    };

    async function clientAction(formData: FormData) {
        if (!phoneVerified) {
            setMessage({ type: 'error', text: "Please verify your phone number to submit." });
            window.scrollTo(0, 0);
            return;
        }

        setMessage(null);
        setFieldErrors(null); // Clear previous errors
        const res = await submitUnifiedApplication({}, formData);

        if (res.success) {
            setMessage({ type: 'success', text: res.message || "Success!" });
            window.scrollTo(0, 0);
            setTimeout(() => {
                window.location.href = '/candidate/application';
            }, 1500);
        } else {
            setMessage({ type: 'error', text: res.message || "Something went wrong." });
            if (res.errors) {
                setFieldErrors(res.errors);
            }
            window.scrollTo(0, 0);
        }
    }

    // Helper to display field error
    const FieldError = ({ name }: { name: string }) => {
        if (!fieldErrors || !fieldErrors[name]) return null;
        return <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors[name][0]}</p>;
    };

    return (
        <form ref={formRef} action={clientAction} className="space-y-8 max-w-4xl mx-auto pb-12">

            {/* Messages */}
            {message && (
                <div className={`p-4 rounded-md flex items-start gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                    {message.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                    <div>
                        <h3 className="font-semibold">{message.type === 'success' ? 'Success' : 'Error'}</h3>
                        <p className="text-sm">{message.text}</p>
                    </div>
                </div>
            )}

            {/* SECTION A: PERSONAL DETAILS */}
            <Card>
                <CardHeader>
                    <CardTitle>Personal Details</CardTitle>
                    <CardDescription>Tell us about yourself.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name <span className="text-red-500">*</span></Label>
                        <Input id="fullName" name="fullName" placeholder="John Doe" required defaultValue={initialProfile?.full_name} />
                        <FieldError name="fullName" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <div className="relative">
                            <Input id="email" name="email" type="email" value={initialProfile?.email || ""} disabled className="bg-gray-100 cursor-not-allowed pr-24" />
                            <span className="absolute right-3 top-2.5 text-xs font-medium text-green-600 flex items-center">
                                Verified <CheckCircle className="w-3 h-3 ml-1" />
                            </span>
                        </div>
                        <p className="text-xs text-gray-500">Email cannot be changed.</p>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="phone">Mobile Number <span className="text-red-500">*</span></Label>
                        <div className="flex gap-2 items-start">
                            <div className="flex-1">
                                <Input
                                    id="phone"
                                    name="phone"
                                    type="tel"
                                    placeholder="Enter 10-digit mobile number"
                                    required
                                    defaultValue={initialProfile?.phone}
                                    readOnly={phoneVerified || otpSent}
                                    className={phoneVerified ? "bg-green-50 border-green-200" : otpSent ? "bg-gray-100" : ""}
                                    onChange={(e) => setPhoneInput(e.target.value)}
                                    maxLength={10}
                                />
                                {phoneVerified && <p className="text-xs text-green-600 mt-1 flex items-center">Mobile number verified <CheckCircle className="w-3 h-3 ml-1" /></p>}
                            </div>

                            {!phoneVerified && !otpSent && (
                                <Button type="button" onClick={handleSendOtp} disabled={phoneLoading || !phoneInput || phoneInput.length < 10} variant="outline">
                                    {phoneLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send OTP"}
                                </Button>
                            )}
                        </div>

                        {otpSent && !phoneVerified && (
                            <div className="mt-3 p-4 bg-blue-50 rounded-md border border-blue-100 animate-fade-in">
                                <Label htmlFor="otp" className="text-blue-800">Enter OTP sent to your mobile</Label>
                                <div className="flex gap-2 mt-2">
                                    <Input
                                        id="otp"
                                        placeholder="XXXXXX"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        maxLength={6}
                                        className="w-32 tracking-widest text-center"
                                    />
                                    <Button type="button" onClick={handleVerifyOtp} disabled={phoneLoading || otp.length < 6}>
                                        {phoneLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
                                    </Button>
                                    <Button type="button" variant="ghost" onClick={() => setOtpSent(false)} disabled={phoneLoading}>Change Number</Button>
                                </div>
                                <p className="text-xs text-blue-600 mt-2 font-medium">
                                    OTP sent to your registered EMAIL address. <br />
                                    (Phone verification uses email OTP due to service policy).
                                </p>
                            </div>
                        )}
                        <input type="hidden" name="phoneVerified" value={phoneVerified ? "true" : "false"} />
                        <FieldError name="phone" />
                    </div>
                </CardContent>
            </Card>

            {/* SECTION B: ADDRESS */}
            <Card>
                <CardHeader>
                    <CardTitle>Address</CardTitle>
                    <CardDescription>Where are you currently located?</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2 space-y-2">
                        <Label htmlFor="addressStreet">Street Address <span className="text-red-500">*</span></Label>
                        <Input id="addressStreet" name="addressStreet" placeholder="Flat No, Street Name, Landmark" required defaultValue={initialProfile?.address_street} />
                        <FieldError name="addressStreet" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="addressCity">City <span className="text-red-500">*</span></Label>
                        <Input id="addressCity" name="addressCity" placeholder="Visakhapatnam" required defaultValue={initialProfile?.address_city} />
                        <FieldError name="addressCity" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="addressState">State <span className="text-red-500">*</span></Label>
                        <select
                            id="addressState"
                            name="addressState"
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            required
                            defaultValue={initialProfile?.address_state || "Andhra Pradesh"}
                        >
                            <option value="Andhra Pradesh">Andhra Pradesh</option>
                            <option value="Telangana">Telangana</option>
                            <option value="Karnataka">Karnataka</option>
                            <option value="Tamil Nadu">Tamil Nadu</option>
                            <option value="Other">Other</option>
                        </select>
                        <FieldError name="addressState" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="addressPincode">Pincode <span className="text-red-500">*</span></Label>
                        <Input id="addressPincode" name="addressPincode" placeholder="530001" maxLength={6} pattern="\d{6}" required defaultValue={initialProfile?.address_pincode} />
                        <FieldError name="addressPincode" />
                    </div>
                </CardContent>
            </Card>

            {/* SECTION C: EDUCATION */}
            <Card>
                <CardHeader>
                    <CardTitle>Education</CardTitle>
                    <CardDescription>Your latest educational qualification.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="educationDegree">Degree <span className="text-red-500">*</span></Label>
                        <Input id="educationDegree" name="educationDegree" placeholder="B.Tech, B.Sc, MCA" required defaultValue={eduData.degree} />
                        <FieldError name="educationDegree" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="educationYear">Graduation Year <span className="text-red-500">*</span></Label>
                        <Input id="educationYear" name="educationYear" placeholder="2024" type="number" min="1990" max="2030" required defaultValue={eduData.year} />
                        <FieldError name="educationYear" />
                    </div>

                    {/* College Selection System */}
                    <div className="md:col-span-2 space-y-4 border-t pt-4 mt-2">
                        <h4 className="text-sm font-semibold text-gray-900">Institute Details</h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="collegeState">State <span className="text-red-500">*</span></Label>
                                <select
                                    id="collegeState"
                                    name="collegeState"
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={collegeState}
                                    onChange={(e) => {
                                        setCollegeState(e.target.value);
                                        setCollegeDistrict(""); // Reset district on state change
                                        setSelectedCollege(""); // Reset college on state change
                                        if (e.target.value !== 'Andhra Pradesh') {
                                            setManualCollege(true); // Force manual if not AP
                                        } else {
                                            setManualCollege(false); // Allow search if AP
                                        }
                                    }}
                                    required
                                >
                                    <option value="Andhra Pradesh">Andhra Pradesh</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            {collegeState === 'Andhra Pradesh' && (
                                <div className="space-y-2">
                                    <Label htmlFor="collegeDistrict">District <span className="text-red-500">*</span></Label>
                                    <select
                                        id="collegeDistrict"
                                        name="collegeDistrict"
                                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={collegeDistrict}
                                        onChange={(e) => {
                                            setCollegeDistrict(e.target.value);
                                            setSelectedCollege(""); // Reset college on district change
                                        }}
                                        required={collegeState === 'Andhra Pradesh'}
                                    >
                                        <option value="">Select District</option>
                                        {AP_DISTRICTS.map((dist) => (
                                            <option key={dist} value={dist}>{dist}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="educationCollege">College / University <span className="text-red-500">*</span></Label>

                            {!manualCollege && collegeState === 'Andhra Pradesh' ? (
                                <>
                                    <Combobox
                                        value={selectedCollege}
                                        onSelect={(val) => {
                                            setSelectedCollege(val);
                                        }}
                                        fetcher={async (q) => {
                                            // Only search if district is selected or we want strict filtering
                                            if (!collegeDistrict) return [];
                                            const res = await searchColleges(q, collegeDistrict);
                                            return res.map(c => ({ label: `${c.name}, ${c.city}`, value: c.name }));
                                        }}
                                        placeholder={collegeDistrict ? "Search college in " + collegeDistrict + "..." : "Select District first"}
                                        searchPlaceholder="Type college name..."
                                        disabled={!collegeDistrict}
                                    />
                                    <input type="hidden" name="educationCollege" value={selectedCollege} />
                                    <input type="hidden" name="educationDistrict" value={collegeDistrict} />

                                    <div className="text-right">
                                        <button type="button" onClick={() => setManualCollege(true)} className="text-xs text-blue-600 hover:underline">
                                            Can't find your college? Enter manually
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-2 animate-fade-in">
                                    <Input id="educationCollege" name="educationCollege" placeholder="Type your college name manually" required defaultValue={eduData.college} />

                                    {collegeState === 'Andhra Pradesh' && (
                                        <div className="text-right">
                                            <button type="button" onClick={() => setManualCollege(false)} className="text-xs text-blue-600 hover:underline">
                                                Back to Search
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                            <FieldError name="educationCollege" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* SECTION D: SKILLS & PREFERENCES */}
            <Card>
                <CardHeader>
                    <CardTitle>Skills & Preferences</CardTitle>
                    <CardDescription>What are you good at and what do you want to do?</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="skills">Skills <span className="text-red-500">*</span></Label>
                        <Input id="skills" name="skills" placeholder="React, Python, SQL, Communication (Comma separated)" required defaultValue={getInitialSkills()} />
                        <p className="text-xs text-gray-500">Separate multiple skills with commas.</p>
                        <FieldError name="skills" />
                    </div>

                    <div className="space-y-2">
                        <Label>Preferred Job Roles <span className="text-red-500">*</span></Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {JOB_ROLES.map((role) => (
                                <button
                                    key={role}
                                    type="button"
                                    onClick={() => toggleRole(role)}
                                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${selectedRoles.includes(role) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                                >
                                    {role}
                                </button>
                            ))}
                        </div>
                        <input type="hidden" name="preferredRoles" value={selectedRoles.join(', ')} />
                        {selectedRoles.length === 0 && <p className="text-xs text-red-500">Please select at least one role.</p>}
                        <FieldError name="preferredRoles" />
                    </div>
                </CardContent>
            </Card>

            {/* SECTION E: RESUME */}
            <Card>
                <CardHeader>
                    <CardTitle>Resume</CardTitle>
                    <CardDescription>Upload your latest CV.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors">
                        <UploadCloud className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                        <Label htmlFor="resume" className="block text-sm font-medium text-gray-900 cursor-pointer">
                            <span>Upload a file</span>
                            <Input id="resume" name="resume" type="file" required accept=".doc,.docx,.pdf" className="hidden" />
                        </Label>
                        <p className="text-xs text-gray-500 mt-1">DOC, DOCX up to 5MB (Recommended)</p>
                        <p className="text-xs text-amber-600 mt-2 font-medium">PDF allowed, but DOCX parsing is better.</p>
                    </div>
                </CardContent>
            </Card>

            {/* SUBMIT */}
            <div className="pt-4">
                <SubmitButton />
                <p className="text-center text-xs text-gray-500 mt-4">
                    By clicking Submit, you agree to our Terms and acknowledge that your profile will be created/updated.
                </p>
            </div>

        </form>
    );
}
