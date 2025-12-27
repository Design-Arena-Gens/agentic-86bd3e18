"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Role = "assistant" | "user";

type Stage =
  | "awaitBusinessType"
  | "awaitBusinessMode"
  | "awaitMainGoal"
  | "awaitBudget"
  | "awaitTimeline"
  | "awaitLeadName"
  | "awaitLeadPhone"
  | "awaitLeadBusinessName"
  | "handoverComplete";

type MainGoal = "leads" | "traffic" | "sales" | "branding" | "unsure";

type BusinessMode = "online" | "local" | "hybrid" | "unsure";

type Message = {
  id: string;
  role: Role;
  content: string;
};

type ConversationContext = {
  businessType?: string;
  businessMode?: BusinessMode;
  mainGoal?: MainGoal;
  budget?: string;
  timeline?: string;
  leadName?: string;
  leadPhone?: string;
  leadBusinessName?: string;
  serviceRecommendation?: string;
};

type AssistantDecision = {
  replies: string[];
  nextStage: Stage;
  updates?: Partial<ConversationContext>;
};

const AGENCY_NAME = "GrowthSpark Media";

const initialMessages: Message[] = [
  {
    id: "m-0",
    role: "assistant",
    content:
      "Hello 👋 Welcome to GrowthSpark Media. Main aapki digital marketing related queries mein help kar sakta hoon. Please bataiye, aapka business kis type ka hai?"
  }
];

let messageCounter = 1;

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [stage, setStage] = useState<Stage>("awaitBusinessType");
  const [context, setContext] = useState<ConversationContext>({});
  const [pendingInput, setPendingInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = pendingInput.trim();
    if (!trimmed || isThinking) {
      return;
    }

    const newMessage: Message = {
      id: `m-${messageCounter++}`,
      role: "user",
      content: trimmed
    };

    setMessages((prev) => [...prev, newMessage]);
    setPendingInput("");
    setIsThinking(true);

    window.setTimeout(() => {
      const decision = generateAssistantDecision(trimmed, stage, context);
      setContext((prev) => ({ ...prev, ...decision.updates }));
      setStage(decision.nextStage);
      setMessages((prev) => [
        ...prev,
        ...decision.replies.map((reply) => ({
          id: `m-${messageCounter++}`,
          role: "assistant" as const,
          content: reply
        }))
      ]);
      setIsThinking(false);
    }, 400);
  };

  const assistantTypingMessage = useMemo<Message | null>(() => {
    if (!isThinking) {
      return null;
    }
    return {
      id: "typing",
      role: "assistant",
      content: "Typing..."
    };
  }, [isThinking]);

  return (
    <div className="page">
      <header className="header">
        <div className="avatar" aria-hidden>
          {AGENCY_NAME
            .split(" ")
            .map((part) => part.at(0))
            .join("")}
        </div>
        <div>
          <h1>{AGENCY_NAME}</h1>
          <p>Digital Marketing WhatsApp Assistant</p>
        </div>
      </header>
      <div className="chat" ref={scrollerRef}>
        {messages.map((message) => (
          <div key={message.id} className={`bubble ${message.role}`}>
            {message.content}
          </div>
        ))}
        {assistantTypingMessage ? (
          <div key={assistantTypingMessage.id} className="bubble assistant typing">
            {assistantTypingMessage.content}
          </div>
        ) : null}
      </div>
      <form className="composer" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Yahan apna reply likhiye..."
          value={pendingInput}
          onChange={(event) => setPendingInput(event.target.value)}
          disabled={isThinking}
          aria-label="Type your message"
        />
        <button type="submit" disabled={isThinking || !pendingInput.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}

function generateAssistantDecision(
  rawInput: string,
  stage: Stage,
  context: ConversationContext
): AssistantDecision {
  const input = rawInput.trim();
  const lower = input.toLowerCase();

  switch (stage) {
    case "awaitBusinessType": {
      return {
        updates: {
          businessType: input
        },
        nextStage: "awaitBusinessMode",
        replies: [
          "Thanks! Aapka business online hai ya local?"
        ]
      };
    }
    case "awaitBusinessMode": {
      const mode = detectBusinessMode(lower);
      return {
        updates: {
          businessMode: mode
        },
        nextStage: "awaitMainGoal",
        replies: [
          "Noted. Abhi aapko sabse zyada kis cheez ki need hai – leads, sales ya branding?",
          "Samajhne ke liye ek quick question: Aapka main goal kya hai?\n1️⃣ Leads generate karna\n2️⃣ Website traffic badhana\n3️⃣ Sales increase karna\n4️⃣ Brand awareness"
        ]
      };
    }
    case "awaitMainGoal": {
      const goal = detectMainGoal(lower);
      return {
        updates: {
          mainGoal: goal
        },
        nextStage: "awaitBudget",
        replies: [
          "Great, goal samajh aa gaya. Aap approx monthly marketing budget share kar sakte ho?"
        ]
      };
    }
    case "awaitBudget": {
      return {
        updates: {
          budget: input
        },
        nextStage: "awaitTimeline",
        replies: [
          "Thanks for sharing! Aap results kis timeline mein expect kar rahe ho? (1–3 months / 3–6 months / 6+ months)"
        ]
      };
    }
    case "awaitTimeline": {
      const updates: Partial<ConversationContext> = {
        timeline: input
      };
      const recommendation = buildRecommendation({ ...context, timeline: input });
      updates.serviceRecommendation = recommendation;

      return {
        updates,
        nextStage: "awaitLeadName",
        replies: [
          recommendation,
          "Process aage badhane ke liye please ye details share karein:\n✅ Name\n✅ Phone Number\n✅ Business Name",
          "Sabse pehle apna naam bataiye please."
        ]
      };
    }
    case "awaitLeadName": {
      return {
        updates: {
          leadName: input
        },
        nextStage: "awaitLeadPhone",
        replies: [
          "Dhanyavaad! Ab contact number share karein (10 digit)."
        ]
      };
    }
    case "awaitLeadPhone": {
      const digits = input.replace(/\D/g, "");
      if (digits.length < 10) {
        return {
          nextStage: "awaitLeadPhone",
          replies: [
            "Number thoda unclear lag raha hai. Kripya valid 10 digit phone number share karein."
          ]
        };
      }
      return {
        updates: {
          leadPhone: digits
        },
        nextStage: "awaitLeadBusinessName",
        replies: [
          "Perfect, ab business ka naam share karein please."
        ]
      };
    }
    case "awaitLeadBusinessName": {
      const updates: Partial<ConversationContext> = {
        leadBusinessName: input
      };
      const handoverMessage =
        "Perfect 👍 Aapka requirement clear hai. Main aapko hamare digital marketing expert se connect kar raha hoon 😊 Woh aapko shortly call ya WhatsApp message karenge.";
      return {
        updates,
        nextStage: "handoverComplete",
        replies: [handoverMessage]
      };
    }
    case "handoverComplete": {
      return {
        updates: {},
        nextStage: "handoverComplete",
        replies: [
          "Thank you! Hamari expert team jaldi hi contact karegi. Tab tak agar koi aur sawaal hai toh zaroor puchiye."
        ]
      };
    }
    default: {
      return {
        updates: {},
        nextStage: stage,
        replies: [
          "Main samajh nahi paya. Kya aap thoda dubara bata sakte ho?"
        ]
      };
    }
  }
}

function detectBusinessMode(lower: string): BusinessMode {
  if (lower.includes("online") || lower.includes("ecommerce") || lower.includes("website")) {
    return "online";
  }
  if (lower.includes("local") || lower.includes("store") || lower.includes("shop") || lower.includes("retail") || lower.includes("offline")) {
    return "local";
  }
  if (lower.includes("both") || lower.includes("hybrid")) {
    return "hybrid";
  }
  return "unsure";
}

function detectMainGoal(lower: string): MainGoal {
  if (/[1]|lead/.test(lower)) {
    return "leads";
  }
  if (/[2]|traffic/.test(lower)) {
    return "traffic";
  }
  if (/[3]|sale/.test(lower)) {
    return "sales";
  }
  if (/[4]|brand/.test(lower)) {
    return "branding";
  }
  return "unsure";
}

function buildRecommendation(context: ConversationContext & { timeline?: string }): string {
  const goal = context.mainGoal ?? "unsure";
  const mode = context.businessMode ?? "unsure";
  const goalDescription = getGoalDescription(goal);
  const baseLine = `Samajh gaya. ${goalDescription}`;

  const solutions = chooseSolutions(goal, mode);

  return [
    baseLine,
    "SEO long-term growth deta hai aur Ads se fast leads milti hain.",
    `Isliye aapke business ke liye ${solutions}.`
  ].join(" \n");
}

function getGoalDescription(goal: MainGoal): string {
  switch (goal) {
    case "leads":
      return "Aap quick leads pe focus karna chahte ho.";
    case "traffic":
      return "Aap website traffic aur organic reach badhana chahte ho.";
    case "sales":
      return "Sales increase priority hai.";
    case "branding":
      return "Brand awareness aur visibility improve karna chahte ho.";
    default:
      return "Aap growth accelerate karna chahte ho.";
  }
}

function chooseSolutions(goal: MainGoal, mode: BusinessMode): string {
  switch (goal) {
    case "leads":
      return "Google Ads + Meta Ads perfect rahenge, saath hi basic SEO se trust build hoga";
    case "traffic":
      return "SEO + content marketing plan best rahega, jisse consistent visitors aayenge";
    case "sales":
      return "performance ads (Google + Meta) aur conversion-focused landing pages recommend karunga";
    case "branding":
      return "Instagram aur Facebook social media marketing ke saath awareness campaigns strong rahengi";
    default:
      if (mode === "local") {
        return "Local SEO aur targeted lead generation ads dono parallel chalane chahiye";
      }
      return "SEO aur Ads ka balanced mix rakhna chahiye";
  }
}
