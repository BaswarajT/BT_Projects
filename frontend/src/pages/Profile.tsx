import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Pencil, ShieldCheck, ShieldAlert } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { updateProfile, type VerificationPurpose } from "../services/profileService";
import { COUNTRIES, getCountry } from "../constants/countries";
import { GENDERS, LANGUAGES, TIMEZONES } from "../constants/profileOptions";
import OtpModal from "../components/OtpModal";
import type { Gender } from "../types";

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600 pb-2 mb-4 border-b border-gray-100">
      {children}
    </h2>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <div className="text-sm text-gray-900 font-medium">{children}</div>
    </div>
  );
}

function VerifyBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
      <ShieldCheck size={12} /> Verified
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
      <ShieldAlert size={12} /> Not verified
    </span>
  );
}

function localNumberFromPhone(phone: string, dial: string | undefined) {
  if (!phone || !dial) return "";
  const prefix = `+${dial}`;
  return phone.startsWith(prefix) ? phone.slice(prefix.length) : "";
}

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpTarget, setOtpTarget] = useState<VerificationPurpose | null>(null);

  const [firstName, setFirstName] = useState(user?.first_name ?? "");
  const [lastName, setLastName] = useState(user?.last_name ?? "");
  const [displayName, setDisplayName] = useState(user?.display_name ?? "");
  const [gender, setGender] = useState<Gender | "">(user?.gender ?? "");
  const [country, setCountry] = useState(user?.country ?? "");
  const [state, setState] = useState(user?.state ?? "");
  const [language, setLanguage] = useState(user?.language || "English");
  const [timezone, setTimezone] = useState(user?.timezone || "Asia/Kolkata");
  const [jobTitle, setJobTitle] = useState(user?.job_title ?? "");
  const [department, setDepartment] = useState(user?.department ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [website, setWebsite] = useState(user?.website ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [localNumber, setLocalNumber] = useState(
    localNumberFromPhone(user?.phone ?? "", getCountry(user?.country)?.dial)
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(user?.avatar ?? null);

  if (!user) return null;

  const selectedCountry = getCountry(country);
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username;
  const genderLabel = GENDERS.find((g) => g.value === user.gender)?.label ?? "Not specified";
  const timezoneLabel = TIMEZONES.find((t) => t.value === user.timezone)?.label ?? user.timezone;
  const userCountry = getCountry(user.country);

  function startEditing() {
    setFirstName(user!.first_name);
    setLastName(user!.last_name);
    setDisplayName(user!.display_name);
    setGender(user!.gender);
    setCountry(user!.country);
    setState(user!.state);
    setLanguage(user!.language || "English");
    setTimezone(user!.timezone || "Asia/Kolkata");
    setJobTitle(user!.job_title);
    setDepartment(user!.department);
    setBio(user!.bio);
    setWebsite(user!.website);
    setEmail(user!.email);
    setLocalNumber(localNumberFromPhone(user!.phone, getCountry(user!.country)?.dial));
    setPreview(user!.avatar);
    setAvatarFile(null);
    setError(null);
    setIsEditing(true);
  }

  function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setAvatarFile(file);
    if (file) setPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (localNumber && !/^\d{10}$/.test(localNumber)) {
      setError("Phone number must be exactly 10 digits.");
      return;
    }
    if (localNumber && !country) {
      setError("Select a country/region for the phone number.");
      return;
    }

    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append("first_name", firstName);
      formData.append("last_name", lastName);
      formData.append("display_name", displayName);
      formData.append("gender", gender);
      formData.append("country", country);
      formData.append("state", state);
      formData.append("language", language);
      formData.append("timezone", timezone);
      formData.append("job_title", jobTitle);
      formData.append("department", department);
      formData.append("bio", bio);
      formData.append("website", website);
      formData.append("email", email);
      formData.append("phone", localNumber && selectedCountry ? `+${selectedCountry.dial}${localNumber}` : "");
      if (avatarFile) formData.append("avatar", avatarFile);
      await updateProfile(formData);
      await refreshUser();
      setIsEditing(false);
    } catch (err) {
      const data = (err as { response?: { data?: Record<string, string[] | string> } })?.response?.data;
      setError(
        data
          ? Object.entries(data).map(([f, m]) => `${f}: ${Array.isArray(m) ? m.join(" ") : m}`).join(" ")
          : "Could not update profile. Check your details and try again."
      );
    } finally {
      setIsSaving(false);
    }
  }

  const initials = (user.first_name?.[0] ?? user.username[0]).toUpperCase();

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 tracking-tight">Profile</h1>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-indigo-600 to-purple-600" />
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-10 mb-6">
            <div className="flex items-end gap-4">
              <div className="w-20 h-20 rounded-full ring-4 ring-white bg-indigo-100 overflow-hidden flex items-center justify-center text-indigo-700 font-bold text-2xl flex-none">
                {(isEditing ? preview : user.avatar) ? (
                  <img
                    src={isEditing ? preview! : user.avatar!}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>
              <div className="pb-1">
                <p className="text-xl font-bold text-gray-900">{fullName}</p>
                <p className="text-sm text-gray-500 font-medium">
                  {user.job_title || "No job title set"}
                  {user.department ? ` · ${user.department}` : ""}
                </p>
              </div>
            </div>
            {!isEditing && (
              <button
                onClick={startEditing}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-indigo-600 border border-indigo-200 rounded-md hover:bg-indigo-50"
              >
                <Pencil size={14} />
                Edit
              </button>
            )}
          </div>

          {!isEditing ? (
            <div className="space-y-8">
              <section>
                <SectionHeading>Personal information</SectionHeading>
                <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                  <Field label="Full Name">{fullName}</Field>
                  <Field label="Display Name">{user.display_name || fullName}</Field>
                  <Field label="Gender">{genderLabel}</Field>
                  <Field label="Country/Region">
                    {userCountry ? (
                      <span className="flex items-center gap-1.5">
                        <span>{userCountry.flag}</span>
                        {userCountry.name}
                      </span>
                    ) : (
                      "Not specified"
                    )}
                  </Field>
                  <Field label="State">{user.state || "Not specified"}</Field>
                  <Field label="Language">{user.language || "English"}</Field>
                  <Field label="Time zone">{timezoneLabel}</Field>
                  <Field label="Bio">
                    <span className="font-normal text-gray-600">{user.bio || "No bio added yet."}</span>
                  </Field>
                </div>
              </section>

              <section>
                <SectionHeading>Contact &amp; verification</SectionHeading>
                <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                  <Field label="Email">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>{user.email}</span>
                      <VerifyBadge verified={user.email_verified} />
                      {!user.email_verified && (
                        <button
                          onClick={() => setOtpTarget("email")}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                        >
                          Verify now
                        </button>
                      )}
                    </div>
                  </Field>
                  <Field label="Phone">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>
                        {user.phone && userCountry
                          ? `+${userCountry.dial} ${user.phone.slice(userCountry.dial.length + 1)}`
                          : "Not specified"}
                      </span>
                      {user.phone && (
                        <>
                          <VerifyBadge verified={user.phone_verified} />
                          {!user.phone_verified && (
                            <button
                              onClick={() => setOtpTarget("phone")}
                              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                            >
                              Verify now
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </Field>
                  <Field label="Website">
                    {user.website ? (
                      <a href={user.website} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                        {user.website}
                      </a>
                    ) : (
                      "Not specified"
                    )}
                  </Field>
                </div>
              </section>

              <section>
                <SectionHeading>Work &amp; account</SectionHeading>
                <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                  <Field label="Job Title">{user.job_title || "Not specified"}</Field>
                  <Field label="Department">{user.department || "Not specified"}</Field>
                  <Field label="Username">{user.username}</Field>
                  <Field label="Role">{user.role}</Field>
                </div>
              </section>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Profile picture</label>
                <input type="file" accept="image/*" onChange={handleAvatarChange} className="text-sm" />
              </div>

              <section>
                <SectionHeading>Personal information</SectionHeading>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
                    <input
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
                    <input
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Display name</label>
                    <input
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                    <select
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      value={gender}
                      onChange={(e) => setGender(e.target.value as Gender)}
                    >
                      <option value="">Select...</option>
                      {GENDERS.map((g) => (
                        <option key={g.value} value={g.value}>{g.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country/Region</label>
                    <select
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                    >
                      <option value="">Select...</option>
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                    <input
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                    <select
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                    >
                      {LANGUAGES.map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time zone</label>
                    <select
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz.value} value={tz.value}>{tz.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                    <textarea
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      rows={2}
                      maxLength={500}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="A short professional summary..."
                    />
                  </div>
                </div>
              </section>

              <section>
                <SectionHeading>Contact &amp; verification</SectionHeading>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email {user.email_verified && email === user.email && <VerifyBadge verified />}
                    </label>
                    <input
                      type="email"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone {user.phone_verified && `+${selectedCountry?.dial}${localNumber}` === user.phone && <VerifyBadge verified />}
                    </label>
                    <div className="flex gap-2">
                      <select
                        className="rounded-md border border-gray-300 px-2 py-2 text-sm w-24 flex-none"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                      >
                        <option value="">Code</option>
                        {COUNTRIES.map((c) => (
                          <option key={c.code} value={c.code}>{c.flag} +{c.dial}</option>
                        ))}
                      </select>
                      <input
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        placeholder="10-digit number"
                        inputMode="numeric"
                        maxLength={10}
                        value={localNumber}
                        onChange={(e) => setLocalNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                    <input
                      type="url"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      placeholder="https://..."
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                    />
                  </div>
                </div>
              </section>

              <section>
                <SectionHeading>Work</SectionHeading>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Job title</label>
                    <input
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                    <input
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                    />
                  </div>
                </div>
              </section>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-sm text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {otpTarget && (
        <OtpModal
          purpose={otpTarget}
          target={otpTarget === "email" ? user.email : user.phone}
          onClose={() => setOtpTarget(null)}
          onVerified={async () => {
            await refreshUser();
            setOtpTarget(null);
          }}
        />
      )}
    </div>
  );
}
