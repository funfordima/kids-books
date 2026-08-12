"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  bookWizardSchema,
  wizardAgeGroups,
  wizardEducationalSubtypes,
  wizardIllustrationStyles,
  wizardPageCounts,
  wizardPronouns,
  wizardSettings,
  wizardStoryTypesByAgeGroup,
  type BookWizardInput
} from "@kids-books/shared";
import { submitBookRequest, type SubmittedBook } from "../lib/backend-client";
import { ErrorSummary } from "./status";

const storyTypeLabels: Record<string, string> = {
  educational: "Educational",
  "big-feelings": "Big feelings",
  bedtime: "Bedtime",
  animals: "Animals",
  adventure: "Adventure",
  family: "Family",
  fantasy: "Fantasy",
  humor: "Humor",
  identity: "Identity",
  nature: "Nature",
  school: "School",
  mystery: "Mystery"
};

const initialInput: BookWizardInput = {
  childName: "",
  ageGroup: "5-6",
  pronouns: "she/her",
  friendName: "",
  petName: "",
  petType: "",
  siblingName: "",
  storyDescription: "",
  storyType: "educational",
  educationalSubtype: "science-discovery",
  setting: "forest",
  illustrationStyle: "watercolor",
  pageCount: 8
};

export const buildWizardValidationMessages = (
  input: BookWizardInput
): string[] => {
  const parsed = bookWizardSchema.safeParse(input);

  if (parsed.success) {
    return [];
  }

  return parsed.error.issues.map((issue) => issue.message);
};

export function BookWizard() {
  const [step, setStep] = useState(1);
  const [input, setInput] = useState<BookWizardInput>(initialInput);
  const [submission, setSubmission] = useState<SubmittedBook | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const messages = useMemo(() => buildWizardValidationMessages(input), [input]);
  const allowedStoryTypes = wizardStoryTypesByAgeGroup[input.ageGroup];

  const updateInput = <Key extends keyof BookWizardInput>(
    key: Key,
    value: BookWizardInput[Key]
  ) => {
    setInput((current) => ({ ...current, [key]: value }));
  };

  const submit = async () => {
    setError(null);

    if (messages.length > 0 || pending) {
      return;
    }

    setPending(true);
    const result = await submitBookRequest(input);
    setPending(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setSubmission(result.data);
    setInput(initialInput);
  };

  if (submission) {
    return (
      <section className="wizard" aria-live="polite">
        <h2>Request queued</h2>
        <p>
          Book <strong>{submission.bookId}</strong> is queued. The dashboard and
          library will show verified backend status as it changes.
        </p>
        <div className="button-row">
          <Link className="button" href="/dashboard">
            Dashboard
          </Link>
          <Link className="button secondary" href="/library">
            Library
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="wizard" aria-labelledby="wizard-title">
      <div className="wizard-header">
        <p className="eyebrow">Step {step} of 5</p>
        <h2 id="wizard-title">Create a book request</h2>
        <p className="muted" role="status" aria-live="polite">
          Personalization stays in memory until you submit.
        </p>
      </div>

      <ErrorSummary
        title="Review these fields"
        messages={[...messages, ...(error ? [error] : [])]}
      />

      {step === 1 ? (
        <fieldset>
          <legend>Child profile</legend>
          <label>
            Child name
            <input
              value={input.childName}
              onChange={(event) => updateInput("childName", event.target.value)}
              aria-describedby="child-name-help"
            />
          </label>
          <p id="child-name-help" className="field-help">
            Used only in the request body, not in the URL.
          </p>
          <label>
            Age band
            <select
              value={input.ageGroup}
              onChange={(event) => {
                const ageGroup = event.target.value as BookWizardInput["ageGroup"];
                updateInput("ageGroup", ageGroup);
                updateInput(
                  "storyType",
                  wizardStoryTypesByAgeGroup[ageGroup][0]
                );
              }}
            >
              {wizardAgeGroups.map((ageGroup) => (
                <option key={ageGroup}>{ageGroup}</option>
              ))}
            </select>
          </label>
          <label>
            Pronouns
            <select
              value={input.pronouns}
              onChange={(event) =>
                updateInput(
                  "pronouns",
                  event.target.value as BookWizardInput["pronouns"]
                )
              }
            >
              {wizardPronouns.map((pronoun) => (
                <option key={pronoun}>{pronoun}</option>
              ))}
            </select>
          </label>
        </fieldset>
      ) : null}

      {step === 2 ? (
        <fieldset>
          <legend>Supporting characters</legend>
          {(["friendName", "petName", "petType", "siblingName"] as const).map(
            (field) => (
              <label key={field}>
                {field.replace(/([A-Z])/gu, " $1")}
                <input
                  value={input[field] ?? ""}
                  onChange={(event) => updateInput(field, event.target.value)}
                />
              </label>
            )
          )}
        </fieldset>
      ) : null}

      {step === 3 ? (
        <fieldset>
          <legend>Story note</legend>
          <label>
            Optional story description
            <textarea
              value={input.storyDescription ?? ""}
              maxLength={500}
              onChange={(event) =>
                updateInput("storyDescription", event.target.value)
              }
            />
          </label>
        </fieldset>
      ) : null}

      {step === 4 ? (
        <fieldset>
          <legend>Story type</legend>
          <label>
            Type
            <select
              value={input.storyType}
              onChange={(event) =>
                updateInput("storyType", event.target.value)
              }
            >
              {allowedStoryTypes.map((storyType) => (
                <option key={storyType} value={storyType}>
                  {storyTypeLabels[storyType]}
                </option>
              ))}
            </select>
          </label>
          {input.storyType === "educational" ? (
            <label>
              Educational focus
              <select
                value={input.educationalSubtype}
                onChange={(event) =>
                  updateInput(
                    "educationalSubtype",
                    event.target.value as BookWizardInput["educationalSubtype"]
                  )
                }
              >
                {wizardEducationalSubtypes.map((subtype) => (
                  <option key={subtype}>{subtype}</option>
                ))}
              </select>
            </label>
          ) : null}
        </fieldset>
      ) : null}

      {step === 5 ? (
        <fieldset>
          <legend>Book settings</legend>
          <label>
            Setting
            <select
              value={input.setting}
              onChange={(event) =>
                updateInput(
                  "setting",
                  event.target.value as BookWizardInput["setting"]
                )
              }
            >
              {wizardSettings.map((setting) => (
                <option key={setting}>{setting}</option>
              ))}
            </select>
          </label>
          <label>
            Illustration style
            <select
              value={input.illustrationStyle}
              onChange={(event) =>
                updateInput(
                  "illustrationStyle",
                  event.target.value as BookWizardInput["illustrationStyle"]
                )
              }
            >
              {wizardIllustrationStyles.map((style) => (
                <option key={style}>{style}</option>
              ))}
            </select>
          </label>
          <label>
            Pages
            <select
              value={input.pageCount}
              onChange={(event) =>
                updateInput(
                  "pageCount",
                  Number(event.target.value) as BookWizardInput["pageCount"]
                )
              }
            >
              {wizardPageCounts.map((count) => (
                <option key={count}>{count}</option>
              ))}
            </select>
          </label>
          <div className="review-box">
            <h3>Review</h3>
            <p>
              {input.pageCount} pages, {storyTypeLabels[input.storyType]},
              {" "}
              {input.illustrationStyle} in {input.setting}.
            </p>
          </div>
        </fieldset>
      ) : null}

      <div className="button-row">
        <button
          type="button"
          className="button secondary"
          disabled={step === 1 || pending}
          onClick={() => setStep((current) => Math.max(1, current - 1))}
        >
          Back
        </button>
        {step < 5 ? (
          <button
            type="button"
            className="button"
            disabled={pending}
            onClick={() => setStep((current) => Math.min(5, current + 1))}
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            className="button"
            disabled={messages.length > 0 || pending}
            onClick={() => {
              void submit();
            }}
          >
            {pending ? "Submitting" : "Submit request"}
          </button>
        )}
      </div>
    </section>
  );
}
