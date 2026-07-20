"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, Pencil, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type EditableProfile = {
	name: string | null;
	displayName: string | null;
	avatarUrl: string | null;
	bio: string | null;
};

const BIO_MAX = 2000;

// Strip a single leading @ for display in the input; the API re-adds it.
function bareHandle(value: string | null): string {
	if (!value) return "";
	return value.startsWith("@") ? value.slice(1) : value;
}

/**
 * Owner-only profile editor. Opens a light glass modal matching the profile
 * aesthetic (not the default dark-overlay dialog) and PATCHes /api/user/profile.
 */
export function ProfileEditor({ profile }: { profile: EditableProfile }) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [saving, setSaving] = useState(false);

	const [name, setName] = useState(profile.name ?? "");
	const [displayName, setDisplayName] = useState(bareHandle(profile.displayName));
	const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? "");
	const [bio, setBio] = useState(profile.bio ?? "");

	async function handleSave() {
		setSaving(true);
		try {
			const res = await fetch("/api/user/profile", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name,
					displayName,
					avatarUrl,
					bio,
				}),
			});

			if (!res.ok) {
				const data = (await res.json().catch(() => null)) as {
					error?: string;
				} | null;
				toast.error(data?.error ?? "Не удалось сохранить");
				return;
			}

			toast.success("Профиль обновлён");
			setOpen(false);
			router.refresh();
		} catch {
			toast.error("Не удалось сохранить");
		} finally {
			setSaving(false);
		}
	}

	return (
		<Dialog.Root onOpenChange={setOpen} open={open}>
			<Dialog.Trigger asChild>
				<button
					className="flex items-center gap-2 rounded-full border border-white/70 bg-white/75 px-4 py-2 text-[13px] text-neutral-700 shadow-[0_18px_50px_rgba(15,23,42,0.10)] backdrop-blur-2xl transition-all hover:bg-white"
					type="button"
				>
					<Pencil className="h-3.5 w-3.5" />
					Редактировать
				</button>
			</Dialog.Trigger>

			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 z-50 bg-neutral-900/20 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
				<Dialog.Content className="-translate-x-1/2 -translate-y-1/2 fixed top-1/2 left-1/2 z-50 flex max-h-[88vh] w-[calc(100vw-2rem)] max-w-md flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white/85 shadow-[0_40px_120px_rgba(15,23,42,0.22)] backdrop-blur-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
					<div className="flex items-center justify-between px-6 pt-6 pb-2">
						<Dialog.Title className="font-light text-[20px] text-neutral-900 tracking-tight">
							Настроить поле
						</Dialog.Title>
						<Dialog.Close asChild>
							<button
								aria-label="Закрыть"
								className="rounded-full p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
								type="button"
							>
								<X className="h-4 w-4" />
							</button>
						</Dialog.Close>
					</div>
					<Dialog.Description className="px-6 pb-4 text-[13px] text-neutral-400 leading-relaxed">
						Как вас видят другие в орбите.
					</Dialog.Description>

					<div className="flex flex-col gap-5 overflow-y-auto px-6 pb-2">
						<Field label="Имя">
							<input
								className="w-full rounded-xl border border-neutral-200 bg-white/60 px-3.5 py-2.5 text-[15px] text-neutral-900 outline-none transition-colors placeholder:text-neutral-300 focus:border-neutral-400"
								maxLength={255}
								onChange={(e) => setName(e.target.value)}
								placeholder="Иван Петров"
								value={name}
							/>
						</Field>

						<Field label="Позывной">
							<div className="flex items-center rounded-xl border border-neutral-200 bg-white/60 px-3.5 py-2.5 transition-colors focus-within:border-neutral-400">
								<span className="font-mono text-[15px] text-neutral-300">@</span>
								<input
									className="w-full bg-transparent pl-1 font-mono text-[15px] text-neutral-900 outline-none placeholder:text-neutral-300"
									maxLength={100}
									onChange={(e) => setDisplayName(e.target.value)}
									placeholder="ivan"
									value={displayName}
								/>
							</div>
						</Field>

						<Field label="Аватар (ссылка)">
							<input
								className="w-full rounded-xl border border-neutral-200 bg-white/60 px-3.5 py-2.5 text-[15px] text-neutral-900 outline-none transition-colors placeholder:text-neutral-300 focus:border-neutral-400"
								maxLength={2048}
								onChange={(e) => setAvatarUrl(e.target.value)}
								placeholder="https://…"
								value={avatarUrl}
							/>
						</Field>

						<Field label="О себе">
							<textarea
								className="min-h-[92px] w-full resize-none rounded-xl border border-neutral-200 bg-white/60 px-3.5 py-2.5 text-[15px] text-neutral-900 leading-relaxed outline-none transition-colors placeholder:text-neutral-300 focus:border-neutral-400"
								maxLength={BIO_MAX}
								onChange={(e) => setBio(e.target.value)}
								placeholder="Чем вы живёте"
								value={bio}
							/>
							<span className="mt-1 block text-right font-mono text-[11px] text-neutral-300">
								{bio.length}/{BIO_MAX}
							</span>
						</Field>
					</div>

					<div className="flex items-center justify-end gap-3 px-6 pt-3 pb-6">
						<Dialog.Close asChild>
							<button
								className="rounded-full px-4 py-2 text-[13px] text-neutral-500 transition-colors hover:text-neutral-800"
								type="button"
							>
								Отмена
							</button>
						</Dialog.Close>
						<button
							className="flex items-center gap-2 rounded-full bg-neutral-900 px-5 py-2 text-[13px] text-white shadow-[0_10px_30px_rgba(15,23,42,0.25)] transition-all hover:bg-neutral-700 disabled:opacity-60"
							disabled={saving}
							onClick={handleSave}
							type="button"
						>
							{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
							Сохранить
						</button>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}

function Field({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<label className="block">
			<span className="mb-2 block text-[11px] uppercase tracking-[0.24em] text-neutral-400">
				{label}
			</span>
			{children}
		</label>
	);
}
