import type { Messages } from '@/i18n';
export function InfoPage({ t, privacy }: { t: Messages; privacy: boolean }) {
  const sections = privacy
    ? [
        [t.storageTitle, t.storage],
        [t.networkTitle, t.network],
        [t.metadataTitle, t.metadata],
      ]
    : [
        [t.qualityTitle, t.quality],
        [t.offlineTitle, t.offline],
        [t.troubleshootingTitle, t.troubleshooting],
        [t.keyboardTitle, t.keyboard],
      ];
  return (
    <>
      {!privacy && (
        <>
          <h2>{t.stepsTitle}</h2>
          <ol>
            {t.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </>
      )}
      {sections.map(([title, text]) => (
        <section key={title}>
          <h2>{title}</h2>
          <p>{text}</p>
        </section>
      ))}
      <a
        class="button"
        href={`${import.meta.env.BASE_URL}THIRD_PARTY_NOTICES.txt`}
      >
        {t.licenses}
      </a>
    </>
  );
}
