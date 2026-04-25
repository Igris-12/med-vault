import type { ChatSession } from '../types/api';

export const MOCK_CHAT_HISTORY: ChatSession[] = [
  {
    _id: 'session-001',
    userId: 'dev-user-001',
    title: 'What were my last HbA1c results?',
    messages: [
      {
        role: 'user',
        content: 'What were my last HbA1c results?',
        sourceDocIds: [],
        timestamp: '2024-04-10T14:00:00.000Z',
      },
      {
        role: 'assistant',
        content:
          "Your most recent HbA1c was **7.9%**, recorded on March 1, 2024 at Fortis Diagnostics [Doc: lab_report, Mar 2024]. This is your fourth consecutive increase — it was 6.8% in March 2022, 7.1% in September 2022, and 7.4% in March 2023. The target for people with Type 2 Diabetes is generally below 7%. I'd recommend discussing this trend with Dr. Meena Kapoor — your doctor may suggest adjusting your Metformin dose or adding another medication.",
        sourceDocIds: ['doc-004', 'doc-003', 'doc-002'],
        timestamp: '2024-04-10T14:00:05.000Z',
      },
      {
        role: 'user',
        content: 'Do my medications interact with each other?',
        sourceDocIds: [],
        timestamp: '2024-04-10T14:02:00.000Z',
      },
      {
        role: 'assistant',
        content:
          "Based on your current active medications — Metformin 1000mg (twice daily) and Lisinopril 10mg (once daily) — there is a **mild interaction** to be aware of [Doc: prescription, Aug 2023].\n\nMetformin and Lisinopril can work together in a way that may lower your blood sugar more than expected, especially during illness, dehydration, or when you're not eating normally. This combination is very commonly prescribed together for diabetes and blood pressure — the benefit far outweighs this mild risk.\n\n**What to watch for:** If you feel unusually dizzy, shaky, or sweaty when unwell, check your blood sugar and eat something. Always remind any new doctor or pharmacist that you're on both medications.",
        sourceDocIds: ['doc-006', 'doc-005'],
        timestamp: '2024-04-10T14:02:08.000Z',
      },
      {
        role: 'user',
        content: 'Should I be worried about my kidneys?',
        sourceDocIds: [],
        timestamp: '2024-04-10T14:05:00.000Z',
      },
      {
        role: 'assistant',
        content:
          "Your kidney numbers deserve attention — not panic, but prompt discussion with your doctor.\n\nYour creatinine has been slowly rising over two years: 0.9 → 1.0 → 1.1 → 1.2 mg/dL [Doc: lab_report, Mar 2024]. Your most recent test also found a small amount of protein in your urine (microalbuminuria, ACR 42 mg/g) — this is an early warning sign that the kidneys are being affected by diabetes.\n\nThe good news: your eGFR (kidney filtering rate) is still 63, which means your kidneys are still working well. Your Lisinopril is actually also protecting your kidneys, which is why it was prescribed.\n\n**Please don't skip your next kidney check.** Catching this early means it can often be slowed significantly with good blood sugar and blood pressure control. I'm not diagnosing anything — your doctor needs to see these trends.",
        sourceDocIds: ['doc-004', 'doc-001'],
        timestamp: '2024-04-10T14:05:12.000Z',
      },
    ],
    createdAt: '2024-04-10T14:00:00.000Z',
  },
];

export const MOCK_SUGGESTED_QUESTIONS = [
  'What were my last HbA1c results?',
  'Do my medications interact with each other?',
  'Should I be worried about my kidneys?',
  'When was my last hospitalization and why?',
  'What are my active medications and doses?',
];
