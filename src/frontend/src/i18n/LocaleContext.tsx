/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import api from "../services/api";
import { accountCreationTranslations } from "./accountCreationTranslations";
import { publicTranslations } from "./publicTranslations";
import { signupTranslations } from "./signupTranslations";
import { translations, type SupportedLocale } from "./translations";

const STORAGE_KEY = "myfitideas.locale";
const originalText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();
let publishedCatalog: Record<string, string> = {};

const canonicalSources: Record<string, string> = {
  "Back to Admin": "Back to Admin Center",
  "Back to Administration": "Back to Admin Center",
};

function canonicalSource(text: string): string {
  return canonicalSources[text] ?? text;
}

function normalizeLocale(value: string | null | undefined): SupportedLocale {
  if (value?.toLowerCase().startsWith("pt")) return "pt-BR";
  return "en-US";
}

function getInitialLocale(): SupportedLocale {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return normalizeLocale(stored);
  try {
    const currentUser = JSON.parse(localStorage.getItem("currentUser") ?? "null") as
      | { preferredLanguage?: string }
      | null;
    if (currentUser?.preferredLanguage) return normalizeLocale(currentUser.preferredLanguage);
  } catch {
    // Ignore malformed cached user data.
  }
  return normalizeLocale(navigator.language);
}

type LocaleContextValue = {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: (text: string) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function bundledTranslation(source: string, locale: SupportedLocale): string | undefined {
  if (locale !== "pt-BR") return undefined;
  return accountCreationTranslations[source] ?? signupTranslations[source] ?? publicTranslations[source] ?? translations[locale][source];
}

function translateText(text: string, locale: SupportedLocale): string {
  const leading = text.match(/^\s*/)?.[0] ?? "";
  const trailing = text.match(/\s*$/)?.[0] ?? "";
  const core = canonicalSource(text.trim());
  if (!core) return text;
  if (locale === "en-US") return `${leading}${core}${trailing}`;

  const direct = publishedCatalog[core] ?? bundledTranslation(core, locale);
  if (direct) return `${leading}${direct}${trailing}`;

  const replacements: Array<[RegExp, string]> = [
    [/^Good Morning, (.+)$/, "Bom dia, $1"],
    [/^Good Afternoon, (.+)$/, "Boa tarde, $1"],
    [/^Good Evening, (.+)$/, "Boa noite, $1"],
    [/^Goal: (.+)$/, "Meta: $1"],
    [/^Daily Goal \($/, "Meta Diária ("],
    [/^Daily Goal \((.+)\)$/, "Meta Diária ($1)"],
    [/^(\d+) entry$/, "$1 registro"],
    [/^(\d+) entries$/, "$1 registros"],
    [/^Weight: (.+)$/, "Peso: $1"],
    [/^Waist: (.+)$/, "Cintura: $1"],
    [/^Chest: (.+)$/, "Peitoral: $1"],
    [/^Hips: (.+)$/, "Quadril: $1"],
    [/^Body Fat: (.+)$/, "Gordura Corporal: $1"],
    [/^(.+) since last measurement$/, "$1 desde a última medida"],
  ];

  for (const [pattern, replacement] of replacements) {
    if (pattern.test(core)) return `${leading}${core.replace(pattern, replacement)}${trailing}`;
  }
  return `${leading}${core}${trailing}`;
}

function isTranslationExcluded(element: Element | null): boolean {
  return Boolean(element?.closest('[data-no-translate="true"]'));
}

function localizeTextNode(node: Text, locale: SupportedLocale): void {
  if (isTranslationExcluded(node.parentElement)) return;
  if (!originalText.has(node)) originalText.set(node, node.nodeValue ?? "");
  const source = originalText.get(node) ?? "";
  const nextValue = translateText(source, locale);
  if (node.nodeValue !== nextValue) node.nodeValue = nextValue;
}

function localizeElement(root: ParentNode, locale: SupportedLocale): void {
  if (root instanceof Element && isTranslationExcluded(root)) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const parent = node.parentElement;
    if (!parent || ["SCRIPT", "STYLE", "TEXTAREA"].includes(parent.tagName)) continue;
    localizeTextNode(node, locale);
  }

  root.querySelectorAll<HTMLElement>("[aria-label], [title], input[placeholder]").forEach((element) => {
    if (isTranslationExcluded(element)) return;
    let saved = originalAttributes.get(element);
    if (!saved) {
      saved = new Map<string, string>();
      originalAttributes.set(element, saved);
    }
    for (const attribute of ["aria-label", "title", "placeholder"] as const) {
      const current = element.getAttribute(attribute);
      if (!current) continue;
      if (!saved.has(attribute)) saved.set(attribute, current);
      const source = saved.get(attribute) ?? current;
      element.setAttribute(attribute, translateText(source, locale));
    }
  });
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>(getInitialLocale);
  const [catalogRevision, setCatalogRevision] = useState(0);

  const setLocale = useCallback((nextLocale: SupportedLocale) => {
    localStorage.setItem(STORAGE_KEY, nextLocale);
    document.documentElement.lang = nextLocale;
    setLocaleState(nextLocale);
  }, []);

  const t = useCallback(
    (text: string) => {
      const source = canonicalSource(text);
      if (locale === "en-US") return source;
      return publishedCatalog[source] ?? bundledTranslation(source, locale) ?? source;
    },
    [locale]
  );

  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem("authToken");

    async function loadPublishedCatalog() {
      publishedCatalog = {};
      if (locale !== "en-US" && token) {
        try {
          const response = await api.get<{ translations: Record<string, string> }>(
            `/api/v1/admin/translations/published/${locale}`
          );
          if (!cancelled) publishedCatalog = response.data.translations;
        } catch (error) {
          console.warn("Unable to load published translations; using bundled fallback.", error);
        }
      }
      if (!cancelled) {
        setCatalogRevision((value) => value + 1);
        localizeElement(document.body, locale);
      }
    }

    void loadPublishedCatalog();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  useEffect(() => {
    document.documentElement.lang = locale;
    localizeElement(document.body, locale);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) localizeTextNode(node as Text, locale);
          else if (node.nodeType === Node.ELEMENT_NODE) localizeElement(node as Element, locale);
        });
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [locale, catalogRevision]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useLocale must be used within LocaleProvider");
  return context;
}
