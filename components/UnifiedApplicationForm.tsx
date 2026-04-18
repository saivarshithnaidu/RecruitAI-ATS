"use client";

import { useState, useRef } from "react";
import { useFormStatus } from "react-dom";
import { submitUnifiedApplication } from "@/app/actions/apply";
import { requestPhoneOtp, verifyPhoneOtp } from "@/app/actions/verify";
import { searchColleges } from "@/app/actions/colleges";
import PhotoUpload from "@/components/PhotoUpload";
import InstitutionSearch from "@/components/InstitutionSearch";
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

function SubmitButton({ isReview = false, onClick }: { isReview?: boolean, onClick?: () => void }) {
    const { pending } = useFormStatus();

    if (isReview) {
        return (
            <Button 
                type="button" 
                onClick={onClick} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 text-lg shadow-lg transition-all hover:scale-[1.02] active:scale-95"
            >
                Review Application →
            </Button>
        );
    }

    return (
        <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-6 text-lg shadow-lg" disabled={pending}>
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Submitting Application...
                </>
            ) : (
                "Final Submit & Lock Application ✅"
            )}
        </Button>
    );
}

// PDF Generation Helper
async function generateApplicationPDF(data: any) {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(37, 99, 235); // Blue-600
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("RecruitAI Application Profile", 15, 25);
    
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 15, 33);

    // Body
    doc.setTextColor(33, 33, 33);
    doc.setFontSize(16);
    doc.text("1. Personal Details", 15, 55);
    doc.line(15, 57, 195, 57);
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    let y = 65;
    doc.text(`Full Name: ${data.fullName}`, 15, y); y+=8;
    doc.text(`Email: ${data.email}`, 15, y); y+=8;
    doc.text(`Phone: ${data.phone}`, 15, y); y+=8;
    doc.text(`Address: ${data.addressStreet}, ${data.addressCity}, ${data.addressState} - ${data.addressPincode}`, 15, y); y+=12;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("2. Education", 15, y); y+=2;
    doc.line(15, y, 195, y); y+=8;
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("10th Standard:", 15, y); y+=6;
    doc.setFont("helvetica", "normal");
    doc.text(`School: ${data.eduTenthSchool} (${data.eduTenthBoard})`, 20, y); y+=6;
    doc.text(`Score: ${data.eduTenthScore} (${data.eduTenthYear})`, 20, y); y+=10;

    doc.setFont("helvetica", "bold");
    doc.text(`${data.eduType === '12th' ? '12th' : 'Diploma'}:`, 15, y); y+=6;
    doc.setFont("helvetica", "normal");
    doc.text(`Institute: ${data.eduInterInstitute} (${data.eduInterBoard})`, 20, y); y+=6;
    doc.text(`Score: ${data.eduInterScore} (${data.eduInterYear})`, 20, y); y+=10;

    doc.setFont("helvetica", "bold");
    doc.text("Graduation:", 15, y); y+=6;
    doc.setFont("helvetica", "normal");
    doc.text(`Degree: ${data.educationDegree} (${data.educationYear})`, 20, y); y+=6;
    doc.text(`College: ${data.educationCollege}`, 20, y); y+=12;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("3. Skills & Roles", 15, y); y+=2;
    doc.line(15, y, 195, y); y+=8;
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Skills: ${data.skills}`, 15, y); y+=8;
    doc.text(`Preferred Roles: ${data.preferredRoles}`, 15, y); y+=20;

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("End of RecruitAI Verified Application Profile.", 105, 280, { align: "center" });
    
    doc.save(`RecruitAI_Application_${data.fullName.replace(/\s+/g, '_')}.pdf`);
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
    // Legacy support: If 'degree' exists at root, treat it as graduation
    const eduTenth = eduData.tenth || {};
    const eduInter = eduData.intermediate || {};
    const eduGrad = eduData.graduation || (eduData.degree ? eduData : {});

    // State
    const [eduType, setEduType] = useState<"12th" | "diploma">(eduInter.type || "12th");

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
    const [selectedCollege, setSelectedCollege] = useState<string>(eduGrad.college || "");
    const [manualCollege, setManualCollege] = useState<boolean>(!eduGrad.college);
    const [collegeState, setCollegeState] = useState<string>("Andhra Pradesh");
    const [collegeDistrict, setCollegeDistrict] = useState<string>("");

    // Roles State
    const [selectedRoles, setSelectedRoles] = useState<string[]>(getInitialRoles());
    const [photoFile, setPhotoFile] = useState<File | null>(null);

    // State for field-level errors
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null);

    // Review Flow State
    const [isReviewMode, setIsReviewMode] = useState(false);
    const [reviewData, setReviewData] = useState<any>(null);
    const [isLocked, setIsLocked] = useState(false);

    // Refs for scrolling
    const sectionsRef = {
        personal: useRef<HTMLDivElement>(null),
        address: useRef<HTMLDivElement>(null),
        education: useRef<HTMLDivElement>(null),
        skills: useRef<HTMLDivElement>(null),
        resume: useRef<HTMLDivElement>(null),
    };

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

    async function handleSaveProgress() {
        if (!formRef.current) return;
        setPhoneLoading(true);
        const formData = new FormData(formRef.current);
        // Manual additions for state-managed fields
        formData.append('preferred_roles', selectedRoles.join(', '));
        
        try {
            const { updateProfile } = await import("@/app/actions/profile");
            const res = await updateProfile(formData);
            if (res.success) {
                setMessage({ type: 'success', text: "Progress saved successfully! You can continue later." });
            } else {
                setMessage({ type: 'error', text: res.error || "Failed to save progress." });
            }
        } catch (err) {
            setMessage({ type: 'error', text: "An error occurred while saving." });
        } finally {
            setPhoneLoading(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    const toggleRole = (role: string) => {
        if (selectedRoles.includes(role)) {
            setSelectedRoles(prev => prev.filter(r => r !== role));
        } else {
            setSelectedRoles(prev => [...prev, role]);
        }
    };

    const handleEnterReview = () => {
        if (!formRef.current) return;
        
        // Manually capture current state of uncontrolled fields
        const formData = new FormData(formRef.current);
        const data: any = {};
        formData.forEach((value, key) => data[key] = value);

        // Add state-managed fields
        data.preferredRoles = selectedRoles.join(', ');
        data.photo = photoFile ? URL.createObjectURL(photoFile) : null;
        data.email = initialProfile?.email;

        // 100% Comprehensive Validation Check before Review
        const requiredFields = [
            { key: 'fullName', label: 'Full Name' },
            { key: 'phone', label: 'Phone Number' },
            { key: 'addressStreet', label: 'Street Address' },
            { key: 'addressCity', label: 'City' },
            { key: 'addressState', label: 'State' },
            { key: 'addressPincode', label: 'Pincode' },
            { key: 'eduTenthSchool', label: '10th School' },
            { key: 'eduTenthBoard', label: '10th Board' },
            { key: 'eduTenthState', label: '10th State' },
            { key: 'eduTenthYear', label: '10th Passing Year' },
            { key: 'eduTenthScore', label: '10th Score' },
            { key: 'eduInterInstitute', label: 'Intermediate/Diploma Institute' },
            { key: 'eduInterBoard', label: 'Intermediate Board' },
            { key: 'eduInterState', label: 'Intermediate State' },
            { key: 'eduInterYear', label: 'Intermediate Year' },
            { key: 'eduInterScore', label: 'Intermediate Score' },
            { key: 'educationDegree', label: 'Graduation Degree' },
            { key: 'educationCollege', label: 'Graduation College' },
            { key: 'educationYear', label: 'Graduation Year' },
            { key: 'skills', label: 'Skills' }
        ];

        let missing = requiredFields.filter(f => !data[f.key]);

        // Conditional Education Check
        if (eduType === '12th' && !data.eduInterStream) missing.push({ key: 'eduInterStream', label: '12th Stream' });
        if (eduType === 'diploma' && !data.eduInterBranch) missing.push({ key: 'eduInterBranch', label: 'Diploma Branch' });

        if (missing.length > 0) {
            setMessage({ type: 'error', text: `Please fill mandatory fields: ${missing.map(m => m.label).join(', ')}` });
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        if (!selectedRoles.length) {
            setMessage({ type: 'error', text: "Please select at least one preferred role." });
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        if (!photoFile) {
            setMessage({ type: 'error', text: "Profile Photo is required." });
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        const resumeFile = data.resume as File;
        if (!resumeFile || resumeFile.size === 0) {
            setMessage({ type: 'error', text: "Please upload your resume." });
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        const hasConsented = formRef.current?.consent.checked;
        if (!hasConsented) {
            setMessage({ type: 'error', text: "Please check the consent box (Terms & Conditions) at the bottom." });
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        if (!phoneVerified) {
            setMessage({ type: 'error', text: "Please verify your phone number via OTP before review." });
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        setReviewData(data);
        setIsReviewMode(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleEditSection = (section: keyof typeof sectionsRef) => {
        setIsReviewMode(false);
        setTimeout(() => {
            sectionsRef[section].current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    };

    async function clientAction(formData: FormData) {
        if (!photoFile) {
            setMessage({ type: 'error', text: "Profile Photo is required." });
            setIsReviewMode(false);
            setReviewData(null);
            window.scrollTo(0, 0);
            return;
        }
        if (!phoneVerified) {
            setMessage({ type: 'error', text: "Please verify your phone number to submit." });
            setIsReviewMode(false);
            setReviewData(null);
            window.scrollTo(0, 0);
            return;
        }

        const hasConsented = formData.get('consent') === 'on';
        if (!hasConsented) {
            setMessage({ type: 'error', text: "You must agree to the terms before submitting." });
            setIsReviewMode(false);
            setReviewData(null);
            window.scrollTo(0, 0);
            return;
        }

        setMessage(null);
        setFieldErrors(null);

        formData.append('profilePhoto', photoFile);

        try {
            const res = await submitUnifiedApplication({}, formData);

            if (res.success) {
                setIsLocked(true);
                setMessage({ type: 'success', text: "Application submitted successfully! Redirecting..." });
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setTimeout(() => {
                    window.location.href = '/candidate/dashboard';
                }, 3000);
            } else {
                setMessage({ type: 'error', text: res.message || "Something went wrong." });
                if (res.errors) {
                    setFieldErrors(res.errors);
                    // Switch back to edit mode so they can see field-level errors
                    setIsReviewMode(false);
                    setReviewData(null);
                }
                window.scrollTo(0, 0);
            }
        } catch (err: any) {
            console.error("Submission error:", err);
            setMessage({ type: 'error', text: "A network error occurred. Please check your connection and try again." });
            window.scrollTo(0, 0);
        }
    }

    // Helper to display field error
    const FieldError = ({ name }: { name: string }) => {
        if (!fieldErrors || !fieldErrors[name]) return null;
        return <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors[name][0]}</p>;
    };

    return (
        <form ref={formRef} action={clientAction} noValidate className={`space-y-8 max-w-4xl mx-auto pb-12 ${isLocked ? 'pointer-events-none opacity-80' : ''}`}>

            {/* Success Banner (Permanent if locked) */}
            {isLocked && (
                <div className="bg-green-600 text-white p-8 rounded-2xl shadow-2xl text-center space-y-4 animate-in zoom-in duration-500">
                    <CheckCircle className="w-16 h-16 mx-auto" />
                    <h2 className="text-3xl font-black">Application Submitted!</h2>
                    <p className="font-semibold text-green-50">Your application has been locked and sent to our partner firms. You will be redirected shortly.</p>
                </div>
            )}

            {/* REVIEW MODE UI */}
            <div className={isReviewMode ? "block space-y-8 animate-in slide-in-from-bottom-5 duration-300" : "hidden"}>
                {reviewData && (
                    <Card className="border-blue-200 border-2 shadow-xl shadow-blue-50">
                        <CardHeader className="bg-blue-50/50">
                            <CardTitle className="text-2xl font-black flex items-center gap-2">
                                <CheckCircle className="text-blue-600" />
                                Review your Application
                            </CardTitle>
                            <CardDescription>Please verify all details before final locking. You cannot edit once submitted.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="md:col-span-1 space-y-4">
                                    <div className="w-full aspect-square bg-gray-100 rounded-xl overflow-hidden border-4 border-white shadow-md">
                                        {reviewData.photo && <img src={reviewData.photo} className="w-full h-full object-cover" alt="Profile View" />}
                                    </div>
                                    <Button type="button" variant="outline" className="w-full gap-2" onClick={() => generateApplicationPDF(reviewData)}>
                                        <UploadCloud className="w-4 h-4" /> Download PDF Preview
                                    </Button>
                                </div>
                                <div className="md:col-span-2 space-y-8">
                                    <ReviewSection title="Personal & Address" data={[
                                        ['Name', reviewData.fullName],
                                        ['Email', reviewData.email],
                                        ['Phone', reviewData.phone],
                                        ['City', reviewData.addressCity],
                                        ['Address', reviewData.addressStreet],
                                    ]} onEdit={() => handleEditSection('personal')} />

                                    <ReviewSection title="Education" data={[
                                        ['10th Score', reviewData.eduTenthScore],
                                        [`${reviewData.eduType} Score`, reviewData.eduInterScore],
                                        ['Graduation', `${reviewData.educationDegree} (${reviewData.educationYear})`],
                                        ['College', reviewData.educationCollege],
                                    ]} onEdit={() => handleEditSection('education')} />

                                    <ReviewSection title="Skills & Roles" data={[
                                        ['Skills', reviewData.skills],
                                        ['Applied Roles', reviewData.preferredRoles],
                                    ]} onEdit={() => handleEditSection('skills')} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <div className="flex gap-4">
                    <Button type="button" variant="outline" onClick={() => setIsReviewMode(false)} className="flex-1 py-6 text-lg font-bold">
                        ← Back to Edit
                    </Button>
                    <div className="flex-1">
                        <SubmitButton />
                    </div>
                </div>
            </div>

            {/* EDIT MODE UI (Persistence Layer) */}
            <div className={isReviewMode ? "hidden" : "space-y-8"}>
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
                <div ref={sectionsRef.personal}>
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
                </div>

                {/* SECTION: PROFILE PHOTO */}
                <Card>
                    <CardHeader>
                        <CardTitle>Profile Photo</CardTitle>
                        <CardDescription>Upload a professional photo for your ID verification.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <PhotoUpload onFileSelect={setPhotoFile} />
                    </CardContent>
                </Card>

                {/* SECTION B: ADDRESS */}
                <div ref={sectionsRef.address}>
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
                                <Input id="addressPincode" name="addressPincode" placeholder="530001" maxLength={6} pattern="\\d{6}" required defaultValue={initialProfile?.address_pincode} />
                                <FieldError name="addressPincode" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* SECTION C: EDUCATION */}
                <div ref={sectionsRef.education} className="space-y-6">
                    {/* C1: 10th Class (SSC) */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Class 10th (SSC)</CardTitle>
                            <CardDescription>Mandatory Secondary School details.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="eduTenthSchool">School Name <span className="text-red-500">*</span></Label>
                                <InstitutionSearch
                                    id="eduTenthSchool"
                                    name="eduTenthSchool"
                                    type="school"
                                    placeholder="Search your 10th school..."
                                    defaultValue={eduTenth.school}
                                    required
                                />
                                <FieldError name="eduTenthSchool" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="eduTenthBoard">Board <span className="text-red-500">*</span></Label>
                                <Input id="eduTenthBoard" name="eduTenthBoard" placeholder="CBSE, ICSE, State Board" required defaultValue={eduTenth.board} />
                                <FieldError name="eduTenthBoard" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="eduTenthState">State <span className="text-red-500">*</span></Label>
                                <Input id="eduTenthState" name="eduTenthState" placeholder="State" required defaultValue={eduTenth.state} />
                                <FieldError name="eduTenthState" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="eduTenthYear">Passing Year <span className="text-red-500">*</span></Label>
                                <Input id="eduTenthYear" name="eduTenthYear" placeholder="2018" type="number" min="1990" max="2030" required defaultValue={eduTenth.year} />
                                <FieldError name="eduTenthYear" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="eduTenthScore">Percentage / CGPA <span className="text-red-500">*</span></Label>
                                <Input id="eduTenthScore" name="eduTenthScore" placeholder="9.8 or 95%" required defaultValue={eduTenth.score} />
                                <FieldError name="eduTenthScore" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* C2: Intermediate / Diploma */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Class 12th / Diploma</CardTitle>
                            <CardDescription>Select one and fill details.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center gap-6 mb-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="eduType"
                                        value="12th"
                                        checked={eduType === '12th'}
                                        onChange={() => setEduType('12th')}
                                        className="w-5 h-5 text-blue-600"
                                    />
                                    <span className={`font-medium ${eduType === '12th' ? 'text-blue-700' : 'text-gray-600'}`}>Class 12th</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="eduType"
                                        value="diploma"
                                        checked={eduType === 'diploma'}
                                        onChange={() => setEduType('diploma')}
                                        className="w-5 h-5 text-blue-600"
                                    />
                                    <span className={`font-medium ${eduType === 'diploma' ? 'text-blue-700' : 'text-gray-600'}`}>Diploma</span>
                                </label>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                                <div className="md:col-span-2 space-y-2">
                                    <Label htmlFor="eduInterInstitute">{eduType === '12th' ? 'College Name' : 'Institute / Polytechnic Name'} <span className="text-red-500">*</span></Label>
                                    <InstitutionSearch
                                        id="eduInterInstitute"
                                        name="eduInterInstitute"
                                        type={eduType === '12th' ? 'college' : 'diploma'}
                                        placeholder={`Search your ${eduType === '12th' ? '12th college' : 'diploma institute'}...`}
                                        defaultValue={eduInter.institute}
                                        required
                                    />
                                    <FieldError name="eduInterInstitute" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="eduInterBoard">Board / University <span className="text-red-500">*</span></Label>
                                    <Input id="eduInterBoard" name="eduInterBoard" placeholder="Board / University" required defaultValue={eduInter.board} />
                                    <FieldError name="eduInterBoard" />
                                </div>
                                {eduType === '12th' ? (
                                    <div className="space-y-2">
                                        <Label htmlFor="eduInterStream">Stream <span className="text-red-500">*</span></Label>
                                        <select
                                            id="eduInterStream"
                                            name="eduInterStream"
                                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                                            required
                                            defaultValue={eduInter.stream || "Science"}
                                        >
                                            <option value="Science">Science (MPC/BiPC)</option>
                                            <option value="Commerce">Commerce</option>
                                            <option value="Arts">Arts</option>
                                            <option value="Vocational">Vocational</option>
                                        </select>
                                        <FieldError name="eduInterStream" />
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <Label htmlFor="eduInterBranch">Branch <span className="text-red-500">*</span></Label>
                                        <Input id="eduInterBranch" name="eduInterBranch" placeholder="Civil, Mechanical, CSE..." required defaultValue={eduInter.branch} />
                                        <FieldError name="eduInterBranch" />
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <Label htmlFor="eduInterState">State <span className="text-red-500">*</span></Label>
                                    <Input id="eduInterState" name="eduInterState" placeholder="State" required defaultValue={eduInter.state} />
                                    <FieldError name="eduInterState" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="eduInterYear">Passing Year <span className="text-red-500">*</span></Label>
                                    <Input id="eduInterYear" name="eduInterYear" placeholder="2020" type="number" min="1990" max="2030" required defaultValue={eduInter.year} />
                                    <FieldError name="eduInterYear" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="eduInterScore">Percentage / CGPA <span className="text-red-500">*</span></Label>
                                    <Input id="eduInterScore" name="eduInterScore" placeholder="85%" required defaultValue={eduInter.score} />
                                    <FieldError name="eduInterScore" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* C3: Graduation */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Graduation</CardTitle>
                            <CardDescription>Highest Qualification Details.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="educationDegree">Degree <span className="text-red-500">*</span></Label>
                                <Input id="educationDegree" name="educationDegree" placeholder="B.Tech, B.Sc, MCA" required defaultValue={eduGrad.degree} />
                                <FieldError name="educationDegree" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="educationYear">Graduation Year <span className="text-red-500">*</span></Label>
                                <Input id="educationYear" name="educationYear" placeholder="2024" type="number" min="1990" max="2030" required defaultValue={eduGrad.year} />
                                <FieldError name="educationYear" />
                            </div>
                            <div className="md:col-span-2 space-y-4 border-t pt-4 mt-2">
                                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider text-blue-600">Graduation Institute</h4>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>State</Label>
                                            <Input value={collegeState} disabled className="bg-gray-50 border-gray-100 placeholder:text-gray-400" placeholder="State" />
                                            <input type="hidden" name="collegeState" value={collegeState} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>District</Label>
                                            <Input value={collegeDistrict} disabled className="bg-gray-50 border-gray-100 placeholder:text-gray-400" placeholder="District" />
                                            <input type="hidden" name="collegeDistrict" value={collegeDistrict} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="educationCollege">Search College / University <span className="text-red-500">*</span></Label>
                                        <InstitutionSearch
                                            id="educationCollege"
                                            name="educationCollege"
                                            type="college"
                                            placeholder="Search for your graduation college..."
                                            defaultValue={eduGrad.college}
                                            required
                                            onSelect={(inst) => {
                                                if (inst.state) setCollegeState(inst.state);
                                                if (inst.district) setCollegeDistrict(inst.district);
                                            }}
                                        />
                                        <FieldError name="educationCollege" />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* SECTION D: SKILLS */}
                <div ref={sectionsRef.skills}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Skills & Preferences</CardTitle>
                            <CardDescription>What are you good at?</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="skills">Skills <span className="text-red-500">*</span></Label>
                                <Input id="skills" name="skills" placeholder="React, Python, SQL" required defaultValue={getInitialSkills()} />
                                <FieldError name="skills" />
                            </div>
                            <div className="space-y-2">
                                <Label>Preferred Roles <span className="text-red-500">*</span></Label>
                                <div className="flex flex-wrap gap-2">
                                    {JOB_ROLES.map((role) => (
                                        <button
                                            key={role}
                                            type="button"
                                            onClick={() => toggleRole(role)}
                                            className={`px-3 py-1.5 rounded-full text-sm font-medium border ${selectedRoles.includes(role) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}
                                        >
                                            {role}
                                        </button>
                                    ))}
                                </div>
                                <input type="hidden" name="preferredRoles" value={selectedRoles.join(', ')} />
                                <FieldError name="preferredRoles" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* SECTION E: RESUME */}
                <div ref={sectionsRef.resume}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Resume</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                                <UploadCloud className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                                <Label htmlFor="resume" className="cursor-pointer">
                                    <span>Upload Resume</span>
                                    <Input id="resume" name="resume" type="file" required accept=".doc,.docx,.pdf" className="hidden" />
                                </Label>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* SECTION F: CONSENT */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-start space-x-3">
                            <input type="checkbox" id="consent" name="consent" required className="mt-1" />
                            <Label htmlFor="consent" className="text-sm text-gray-700">
                                I agree to the Terms & Conditions and Privacy Policy.
                            </Label>
                        </div>
                    </CardContent>
                </Card>

                <div className="pt-4 flex flex-col md:flex-row gap-4">
                    <Button 
                        type="button" 
                        variant="outline" 
                        onClick={handleSaveProgress} 
                        disabled={phoneLoading}
                        className="flex-1 py-6 text-lg font-semibold border-2 border-blue-200 hover:bg-blue-50 text-blue-700"
                    >
                        {phoneLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <UploadCloud className="w-5 h-5 mr-2" />}
                        Save Application Progress
                    </Button>
                    <div className="flex-1">
                        <SubmitButton isReview onClick={handleEnterReview} />
                    </div>
                </div>
            </div>
        </form>
    );
}

function ReviewSection({ title, data, onEdit }: { title: string, data: [string, any][], onEdit: () => void }) {
    return (
        <div className="space-y-3">
            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border-l-4 border-blue-600">
                <h4 className="font-bold">{title}</h4>
                <button type="button" onClick={onEdit} className="text-xs text-blue-600 font-bold hover:underline">Edit</button>
            </div>
            <div className="grid grid-cols-1 gap-1 text-sm pl-4">
                {data.map(([label, value], i) => (
                    <div key={i} className="flex flex-col mb-2">
                        <span className="text-[10px] uppercase font-bold text-gray-400">{label}</span>
                        <span className="text-gray-700 font-medium">{value || "N/A"}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
