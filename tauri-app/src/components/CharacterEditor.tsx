import { useEffect, useMemo, useRef, useState } from "react";
import { confirm, open as openDialog } from "@tauri-apps/plugin-dialog";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import CreateItemDialog from "./CreateItemDialog";
import DocumentEditor from "./DocumentEditor";
import { useProject } from "../contexts/ProjectContext";

type CharacterRelation = {
  targetId: string;
  relation: string;
  query: string;
};

type CustomField = {
  key: string;
  value: string;
};

type CharacterForm = {
  aliases: string;
  role: string;
  tags: string;
  avatar: string;
  appearance: string;
  background: string;
  weapon: string;
  level: string;
  health: string;
  location: string;
  relationships: CharacterRelation[];
  basicCustomFields: CustomField[];
  attributeCustomFields: CustomField[];
  stateCustomFields: CustomField[];
  notesHtml: string;
};

function createEmptyForm(): CharacterForm {
  return {
    aliases: "",
    role: "配角",
    tags: "",
    avatar: "",
    appearance: "",
    background: "",
    weapon: "",
    level: "",
    health: "",
    location: "",
    relationships: [],
    basicCustomFields: [],
    attributeCustomFields: [],
    stateCustomFields: [],
    notesHtml: "<p></p>",
  };
}

function parseArrayValue(raw: string): string[] {
  const cleaned = raw.trim().replace(/^\[/, "").replace(/\]$/, "");
  if (!cleaned) return [];
  return cleaned
    .split(",")
    .map((item) => item.trim().replace(/^"|"$/g, ""))
    .filter(Boolean);
}

function parseQuotedValue(raw: string): string {
  return raw.trim().replace(/^"|"$/g, "");
}

function parseCustomFieldLine(line: string): CustomField | null {
  const normalized = line.trim();
  if (!normalized || normalized === "{}") return null;
  const colonIndex = normalized.indexOf(":");
  if (colonIndex <= 0) return null;
  const key = normalized.slice(0, colonIndex).trim();
  const value = parseQuotedValue(normalized.slice(colonIndex + 1));
  if (!key) return null;
  return { key, value };
}

function parseCharacterMarkdown(markdown: string, fallbackRole: string, fallbackTags: string[]): CharacterForm {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return {
      ...createEmptyForm(),
      role: fallbackRole || "配角",
      tags: fallbackTags.join(","),
      notesHtml: markdown || "<p></p>",
    };
  }

  const frontmatter = match[1];
  const body = match[2] || "<p></p>";
  const lines = frontmatter.split("\n");
  const form: CharacterForm = {
    ...createEmptyForm(),
    role: fallbackRole || "配角",
    tags: fallbackTags.join(","),
    notesHtml: body,
  };

  let section:
    | "none"
    | "attributes"
    | "state"
    | "relationships"
    | "custom_basic"
    | "custom_attributes"
    | "custom_state" = "none";
  let relationIndex = -1;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed === "attributes:") {
      section = "attributes";
      continue;
    }
    if (trimmed === "state:") {
      section = "state";
      continue;
    }
    if (trimmed === "relationships:") {
      section = "relationships";
      continue;
    }
    if (trimmed === "custom_basic:") {
      section = "custom_basic";
      continue;
    }
    if (trimmed === "custom_attributes:") {
      section = "custom_attributes";
      continue;
    }
    if (trimmed === "custom_state:") {
      section = "custom_state";
      continue;
    }

    if (trimmed.startsWith("aliases:")) {
      form.aliases = parseArrayValue(trimmed.slice("aliases:".length)).join(",");
      continue;
    }
    if (trimmed.startsWith("role:")) {
      form.role = parseQuotedValue(trimmed.slice("role:".length)) || "配角";
      continue;
    }
    if (trimmed.startsWith("tags:")) {
      form.tags = parseArrayValue(trimmed.slice("tags:".length)).join(",");
      continue;
    }
    if (trimmed.startsWith("avatar:")) {
      form.avatar = parseQuotedValue(trimmed.slice("avatar:".length));
      continue;
    }

    if (section === "attributes") {
      if (trimmed.startsWith("appearance:")) {
        form.appearance = parseQuotedValue(trimmed.slice("appearance:".length));
      } else if (trimmed.startsWith("background:")) {
        form.background = parseQuotedValue(trimmed.slice("background:".length));
      } else if (trimmed.startsWith("weapon:")) {
        form.weapon = parseQuotedValue(trimmed.slice("weapon:".length));
      }
      continue;
    }

    if (section === "state") {
      if (trimmed.startsWith("level:")) {
        form.level = parseQuotedValue(trimmed.slice("level:".length));
      } else if (trimmed.startsWith("health:")) {
        form.health = parseQuotedValue(trimmed.slice("health:".length));
      } else if (trimmed.startsWith("location:")) {
        form.location = parseQuotedValue(trimmed.slice("location:".length));
      }
      continue;
    }

    if (section === "relationships") {
      if (trimmed === "[]") {
        form.relationships = [];
        continue;
      }
      if (trimmed.startsWith("- target:")) {
        const targetId = trimmed.slice("- target:".length).trim();
        form.relationships.push({ targetId, relation: "", query: "" });
        relationIndex = form.relationships.length - 1;
        continue;
      }
      if (trimmed.startsWith("relation:") && relationIndex >= 0) {
        form.relationships[relationIndex].relation = parseQuotedValue(trimmed.slice("relation:".length));
      }
      continue;
    }

    if (section === "custom_basic") {
      const field = parseCustomFieldLine(trimmed);
      if (field) form.basicCustomFields.push(field);
      continue;
    }

    if (section === "custom_attributes") {
      const field = parseCustomFieldLine(trimmed);
      if (field) form.attributeCustomFields.push(field);
      continue;
    }

    if (section === "custom_state") {
      const field = parseCustomFieldLine(trimmed);
      if (field) form.stateCustomFields.push(field);
      continue;
    }
  }

  return form;
}

function parseMarkdownCharacterId(markdown: string): string {
  const match = markdown.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return "";
  const idMatch = match[1].match(/^id:\s*(.+)$/m);
  return idMatch?.[1]?.trim() || "";
}

function composeCustomFields(fields: CustomField[]): string {
  const lines = fields
    .filter((field) => field.key.trim())
    .map(
      (field) =>
        `  ${field.key.trim().replace(/"/g, '\\"')}: "${field.value.trim().replace(/"/g, '\\"')}"`
    );
  return lines.length > 0 ? lines.join("\n") : "  {}";
}

function buildDefaultCustomFieldKey(fields: CustomField[]): string {
  const used = new Set(fields.map((field) => field.key.trim()).filter(Boolean));
  let idx = 1;
  while (used.has(`新字段${idx}`)) {
    idx += 1;
  }
  return `新字段${idx}`;
}

function composeCharacterMarkdown(characterId: string, name: string, form: CharacterForm): string {
  const aliases = form.aliases
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => `"${item.replace(/"/g, '\\"')}"`)
    .join(", ");

  const tags = form.tags
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => `"${item.replace(/"/g, '\\"')}"`)
    .join(", ");

  const relationships = form.relationships
    .filter((row) => row.targetId && row.relation.trim())
    .map(
      (row) =>
        `  - target: ${row.targetId}\n    relation: "${row.relation.trim().replace(/"/g, '\\"')}"`
    )
    .join("\n");

  const safeRole = form.role.trim() || "配角";
  const safeAvatar = form.avatar.trim();

  return `---
id: ${characterId}
schema_version: 1
name: ${name}
aliases: [${aliases}]
role: ${safeRole}
tags: [${tags}]
avatar: "${safeAvatar.replace(/"/g, '\\"')}"
attributes:
  appearance: "${form.appearance.replace(/"/g, '\\"')}"
  background: "${form.background.replace(/"/g, '\\"')}"
  weapon: "${form.weapon.replace(/"/g, '\\"')}"
state:
  level: "${form.level.replace(/"/g, '\\"')}"
  health: "${form.health.replace(/"/g, '\\"')}"
  location: "${form.location.replace(/"/g, '\\"')}"
relationships:
${relationships || "  []"}
custom_basic:
${composeCustomFields(form.basicCustomFields)}
custom_attributes:
${composeCustomFields(form.attributeCustomFields)}
custom_state:
${composeCustomFields(form.stateCustomFields)}
---

${form.notesHtml}`;
}

export default function CharacterEditor() {
  const {
    projectPath,
    projectMetadata,
    currentCharacterId,
    currentCharacterContent,
    updateCharacterContent,
    renameCharacter,
    deleteCharacter,
  } = useProject();

  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [form, setForm] = useState<CharacterForm | null>(null);
  const [newTag, setNewTag] = useState("");
  const initializedCharacterIdRef = useRef<string | null>(null);

  const currentCharacter = useMemo(
    () => projectMetadata?.characters.find((character) => character.id === currentCharacterId),
    [projectMetadata, currentCharacterId]
  );

  const characterNameById = useMemo(() => {
    const map = new Map<string, string>();
    (projectMetadata?.characters ?? []).forEach((character) => {
      map.set(character.id, character.name);
    });
    return map;
  }, [projectMetadata]);

  useEffect(() => {
    setForm(null);
    setNewTag("");
    initializedCharacterIdRef.current = null;
  }, [currentCharacterId]);

  useEffect(() => {
    if (!currentCharacter) {
      setForm(null);
      initializedCharacterIdRef.current = null;
      return;
    }

    const contentCharacterId = parseMarkdownCharacterId(currentCharacterContent);
    if (contentCharacterId && contentCharacterId !== currentCharacter.id) {
      // loadCharacter 异步切换时，先等到对应角色内容就绪，避免把旧角色数据解析进新角色
      return;
    }

    if (initializedCharacterIdRef.current === currentCharacter.id && form) {
      return;
    }

    setForm(
      parseCharacterMarkdown(
        currentCharacterContent,
        currentCharacter.role || "",
        currentCharacter.tags || []
      )
    );
    setNewTag("");
    initializedCharacterIdRef.current = currentCharacter.id;
  }, [
    currentCharacterId,
    currentCharacter?.id,
    currentCharacter?.role,
    currentCharacter?.tags,
    currentCharacterContent,
    form,
  ]);

  useEffect(() => {
    if (!form) return;
    setForm((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        relationships: prev.relationships.map((row) => ({
          ...row,
          query: row.query || characterNameById.get(row.targetId) || "",
        })),
      };
    });
  }, [characterNameById]);

  if (!currentCharacterId || !currentCharacter || !form) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <p className="text-lg mb-2">👤</p>
          <p>请从左侧选择或创建角色卡</p>
        </div>
      </div>
    );
  }

  const tagList = form.tags
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const avatarPreviewSrc = form.avatar
    ? form.avatar.startsWith("http") || form.avatar.startsWith("data:")
      ? form.avatar
      : convertFileSrc(form.avatar)
    : "";

  const updateField = (key: keyof CharacterForm, value: string) => {
    setForm((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [key]: value };
      const markdown = composeCharacterMarkdown(currentCharacter.id, currentCharacter.name, next);
      if (markdown !== currentCharacterContent) {
        updateCharacterContent(markdown);
      }
      return next;
    });
  };

  const updateRelationship = (index: number, patch: Partial<CharacterRelation>) => {
    setForm((prev) => {
      if (!prev) return prev;
      const next = [...prev.relationships];
      next[index] = { ...next[index], ...patch };
      const updatedForm = { ...prev, relationships: next };
      const markdown = composeCharacterMarkdown(currentCharacter.id, currentCharacter.name, updatedForm);
      if (markdown !== currentCharacterContent) {
        updateCharacterContent(markdown);
      }
      return updatedForm;
    });
  };

  const addRelationship = () => {
    setForm((prev) => {
      if (!prev) return prev;
      const updatedForm = {
        ...prev,
        relationships: [...prev.relationships, { targetId: "", relation: "", query: "" }],
      };
      const markdown = composeCharacterMarkdown(currentCharacter.id, currentCharacter.name, updatedForm);
      if (markdown !== currentCharacterContent) {
        updateCharacterContent(markdown);
      }
      return updatedForm;
    });
  };

  const removeRelationship = (index: number) => {
    const relationToRemove = form.relationships[index];

    setForm((prev) => {
      if (!prev) return prev;
      const updatedForm = {
        ...prev,
        relationships: prev.relationships.filter((_, i) => i !== index),
      };
      const markdown = composeCharacterMarkdown(currentCharacter.id, currentCharacter.name, updatedForm);
      if (markdown !== currentCharacterContent) {
        updateCharacterContent(markdown);
      }
      return updatedForm;
    });

    const syncReciprocalDelete = async () => {
      if (!projectPath || !relationToRemove?.targetId) return;
      if (relationToRemove.targetId === currentCharacter.id) return;

      const targetCharacter = (projectMetadata?.characters ?? []).find(
        (character) => character.id === relationToRemove.targetId
      );
      if (!targetCharacter) return;

      try {
        const targetMarkdown = await invoke<string>("load_character", {
          projectPath,
          characterId: targetCharacter.id,
        });

        const targetForm = parseCharacterMarkdown(
          targetMarkdown,
          targetCharacter.role || "",
          targetCharacter.tags || []
        );

        const nextRelationships = targetForm.relationships.filter(
          (row) => row.targetId !== currentCharacter.id
        );

        if (nextRelationships.length === targetForm.relationships.length) {
          return;
        }

        const updatedTargetForm: CharacterForm = {
          ...targetForm,
          relationships: nextRelationships,
        };

        const updatedTargetMarkdown = composeCharacterMarkdown(
          targetCharacter.id,
          targetCharacter.name,
          updatedTargetForm
        );

        await invoke("save_character", {
          projectPath,
          characterId: targetCharacter.id,
          content: updatedTargetMarkdown,
        });
      } catch (error) {
        console.error("同步删除对向关系失败:", error);
      }
    };

    void syncReciprocalDelete();
  };

  const updateCustomField = (
    section: "basicCustomFields" | "attributeCustomFields" | "stateCustomFields",
    index: number,
    patch: Partial<CustomField>
  ) => {
    setForm((prev) => {
      if (!prev) return prev;
      const next = [...prev[section]];
      next[index] = { ...next[index], ...patch };
      const updatedForm = { ...prev, [section]: next };
      const markdown = composeCharacterMarkdown(currentCharacter.id, currentCharacter.name, updatedForm);
      if (markdown !== currentCharacterContent) {
        updateCharacterContent(markdown);
      }
      return updatedForm;
    });
  };

  const addCustomField = (section: "basicCustomFields" | "attributeCustomFields" | "stateCustomFields") => {
    setForm((prev) => {
      if (!prev) return prev;
      const defaultKey = buildDefaultCustomFieldKey(prev[section]);
      const updatedForm = {
        ...prev,
        [section]: [...prev[section], { key: defaultKey, value: "" }],
      };
      const markdown = composeCharacterMarkdown(currentCharacter.id, currentCharacter.name, updatedForm);
      if (markdown !== currentCharacterContent) {
        updateCharacterContent(markdown);
      }
      return updatedForm;
    });
  };

  const removeCustomField = (
    section: "basicCustomFields" | "attributeCustomFields" | "stateCustomFields",
    index: number
  ) => {
    setForm((prev) => {
      if (!prev) return prev;
      const updatedForm = {
        ...prev,
        [section]: prev[section].filter((_, i) => i !== index),
      };
      const markdown = composeCharacterMarkdown(currentCharacter.id, currentCharacter.name, updatedForm);
      if (markdown !== currentCharacterContent) {
        updateCharacterContent(markdown);
      }
      return updatedForm;
    });
  };

  const addTag = () => {
    const value = newTag.trim();
    if (!value) return;
    if (tagList.includes(value)) {
      setNewTag("");
      return;
    }
    updateField("tags", [...tagList, value].join(","));
    setNewTag("");
  };

  const removeTag = (tag: string) => {
    updateField(
      "tags",
      tagList.filter((item) => item !== tag).join(",")
    );
  };

  const handleSelectAvatar = async () => {
    if (!projectPath) return;

    const selected = await openDialog({
      title: "选择角色头像",
      multiple: false,
      filters: [
        {
          name: "图片文件",
          extensions: ["png", "jpg", "jpeg", "webp", "gif", "bmp"],
        },
      ],
    });

    if (!selected) return;
    const selectedPath = Array.isArray(selected) ? selected[0] : selected;
    if (selectedPath) {
      try {
        const storedPath = await invoke<string>("copy_avatar_to_project", {
          projectPath,
          characterId: currentCharacter.id,
          sourcePath: selectedPath,
        });
        updateField("avatar", storedPath);
      } catch (error) {
        console.error("复制头像失败:", error);
      }
    }
  };

  const handleDelete = async () => {
    const agreed = await confirm(`确认删除角色「${currentCharacter.name}」吗？`, {
      title: "删除角色",
      kind: "warning",
      okLabel: "删除",
      cancelLabel: "取消",
    });
    if (!agreed) return;
    await deleteCharacter(currentCharacter.id);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-gray-200 bg-gray-50 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSelectAvatar}
              className="group relative h-12 w-12 overflow-hidden rounded-full border border-gray-300 bg-gray-100"
              title="点击选择头像"
            >
              {avatarPreviewSrc ? (
                <img src={avatarPreviewSrc} alt={currentCharacter.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-gray-600">
                  {currentCharacter.name.slice(0, 1).toUpperCase()}
                </div>
              )}
              <span className="absolute inset-0 hidden items-center justify-center bg-black/45 text-[10px] text-white group-hover:flex">
                选图
              </span>
            </button>
            <div>
              <p className="text-base font-semibold text-gray-900">{currentCharacter.name}</p>
              <p className="text-xs text-gray-500">角色ID: {currentCharacter.id}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowRenameDialog(true)}
              className="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
            >
              重命名
            </button>
            <button
              onClick={handleDelete}
              className="rounded border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100"
            >
              删除
            </button>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto p-4 md:grid-cols-2">
        <section className="rounded-lg border border-gray-200 bg-white p-3">
          <h3 className="mb-2 text-sm font-semibold text-gray-800">基础信息卡</h3>
          <div className="space-y-2">
            <p className="text-xs text-gray-500">头像请点击顶部圆形头像进行选择</p>
            <label className="block text-xs text-gray-600">
              角色定位（自由输入）
              <input
                value={form.role}
                onChange={(e) => updateField("role", e.target.value)}
                placeholder="如：主角/反派/导师"
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
              />
            </label>
            <label className="block text-xs text-gray-600">
              别名（逗号分隔）
              <input
                value={form.aliases}
                onChange={(e) => updateField("aliases", e.target.value)}
                placeholder="如：林老大,剑尊"
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
              />
            </label>
            <label className="block text-xs text-gray-600">
              标签（可增删）
              <div className="mt-1 flex flex-wrap gap-1">
                {tagList.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => removeTag(tag)}
                    className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-100"
                    title="点击删除标签"
                  >
                    {tag} x
                  </button>
                ))}
                {tagList.length === 0 && <span className="text-xs text-gray-400">暂无标签</span>}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="输入标签后回车或点击添加"
                  className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                />
                <button
                  onClick={addTag}
                  className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
                >
                  添加
                </button>
              </div>
            </label>

            {form.basicCustomFields.map((row, index) => (
              <div key={`basic-${index}`} className="rounded border border-gray-200 p-2">
                <label className="block text-xs text-gray-600">
                  字段名
                  <input
                    value={row.key}
                    onChange={(e) => updateCustomField("basicCustomFields", index, { key: e.target.value })}
                    placeholder="如：阵营/立场/身份"
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
                  />
                </label>
                <label className="mt-2 block text-xs text-gray-600">
                  字段内容
                  <input
                    value={row.value}
                    onChange={(e) => updateCustomField("basicCustomFields", index, { value: e.target.value })}
                    placeholder="填写该字段的内容"
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
                  />
                </label>
                <div className="mt-2 text-right">
                  <button
                    onClick={() => removeCustomField("basicCustomFields", index)}
                    className="rounded border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700"
                  >
                    删除字段
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={() => addCustomField("basicCustomFields")}
              className="rounded border border-blue-300 bg-blue-50 px-2 py-1 text-xs text-blue-700"
            >
              + 添加基础字段
            </button>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-3">
          <h3 className="mb-2 text-sm font-semibold text-gray-800">静态属性卡</h3>
          <div className="space-y-2">
            <label className="block text-xs text-gray-600">
              外貌
              <input
                value={form.appearance}
                onChange={(e) => updateField("appearance", e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
              />
            </label>
            <label className="block text-xs text-gray-600">
              背景
              <input
                value={form.background}
                onChange={(e) => updateField("background", e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
              />
            </label>
            <label className="block text-xs text-gray-600">
              武器
              <input
                value={form.weapon}
                onChange={(e) => updateField("weapon", e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
              />
            </label>

            {form.attributeCustomFields.map((row, index) => (
              <div key={`attr-${index}`} className="rounded border border-gray-200 p-2">
                <label className="block text-xs text-gray-600">
                  字段名
                  <input
                    value={row.key}
                    onChange={(e) => updateCustomField("attributeCustomFields", index, { key: e.target.value })}
                    placeholder="如：体质/天赋/血脉"
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
                  />
                </label>
                <label className="mt-2 block text-xs text-gray-600">
                  字段内容
                  <input
                    value={row.value}
                    onChange={(e) => updateCustomField("attributeCustomFields", index, { value: e.target.value })}
                    placeholder="填写该字段的内容"
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
                  />
                </label>
                <div className="mt-2 text-right">
                  <button
                    onClick={() => removeCustomField("attributeCustomFields", index)}
                    className="rounded border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700"
                  >
                    删除字段
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={() => addCustomField("attributeCustomFields")}
              className="rounded border border-blue-300 bg-blue-50 px-2 py-1 text-xs text-blue-700"
            >
              + 添加静态字段
            </button>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-3">
          <h3 className="mb-2 text-sm font-semibold text-gray-800">动态状态卡</h3>
          <div className="space-y-2">
            <label className="block text-xs text-gray-600">
              境界/实力
              <input
                value={form.level}
                onChange={(e) => updateField("level", e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
              />
            </label>
            <label className="block text-xs text-gray-600">
              健康状态
              <input
                value={form.health}
                onChange={(e) => updateField("health", e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
              />
            </label>
            <label className="block text-xs text-gray-600">
              当前地点
              <input
                value={form.location}
                onChange={(e) => updateField("location", e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
              />
            </label>

            {form.stateCustomFields.map((row, index) => (
              <div key={`state-${index}`} className="rounded border border-gray-200 p-2">
                <label className="block text-xs text-gray-600">
                  字段名
                  <input
                    value={row.key}
                    onChange={(e) => updateCustomField("stateCustomFields", index, { key: e.target.value })}
                    placeholder="如：情绪/目标/负面状态"
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
                  />
                </label>
                <label className="mt-2 block text-xs text-gray-600">
                  字段内容
                  <input
                    value={row.value}
                    onChange={(e) => updateCustomField("stateCustomFields", index, { value: e.target.value })}
                    placeholder="填写该字段的内容"
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
                  />
                </label>
                <div className="mt-2 text-right">
                  <button
                    onClick={() => removeCustomField("stateCustomFields", index)}
                    className="rounded border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700"
                  >
                    删除字段
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={() => addCustomField("stateCustomFields")}
              className="rounded border border-blue-300 bg-blue-50 px-2 py-1 text-xs text-blue-700"
            >
              + 添加状态字段
            </button>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-3">
          <h3 className="mb-2 text-sm font-semibold text-gray-800">关系与备注卡</h3>
          <div className="space-y-2">
            {form.relationships.map((row, index) => (
              <div key={`${row.targetId}-${index}`} className="rounded border border-gray-200 p-2">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <label className="text-xs text-gray-600">
                    关联角色（可搜索）
                    <input
                      list={`character-options-${index}`}
                      value={row.query}
                      onChange={(e) => {
                        const query = e.target.value;
                        const matched = (projectMetadata?.characters ?? []).find(
                          (character) => character.name === query
                        );
                        updateRelationship(index, {
                          query,
                          targetId: matched ? matched.id : "",
                        });
                      }}
                      placeholder="输入角色名搜索"
                      className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    />
                    <datalist id={`character-options-${index}`}>
                      {(projectMetadata?.characters ?? [])
                        .filter((character) => character.id !== currentCharacter.id)
                        .map((character) => (
                          <option key={character.id} value={character.name} />
                        ))}
                    </datalist>
                  </label>

                  <label className="text-xs text-gray-600">
                    关系描述
                    <input
                      value={row.relation}
                      onChange={(e) => updateRelationship(index, { relation: e.target.value })}
                      placeholder="如：宿敌/盟友/师徒"
                      className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    />
                  </label>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {row.targetId ? `已绑定ID: ${row.targetId}` : "未绑定角色ID"}
                  </span>
                  <button
                    onClick={() => removeRelationship(index)}
                    className="rounded border border-red-300 bg-red-50 px-2 py-0.5 text-xs text-red-700 hover:bg-red-100"
                  >
                    移除
                  </button>
                </div>
              </div>
            ))}

            <button
              onClick={addRelationship}
              className="rounded border border-blue-300 bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100"
            >
              + 添加关系
            </button>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-3 md:col-span-2">
          <h3 className="mb-2 text-sm font-semibold text-gray-800">角色小传与设定笔记</h3>
          <div className="h-80 overflow-hidden rounded border border-gray-200">
            <DocumentEditor
              content={form.notesHtml || "<p></p>"}
              onContentChange={(value) => updateField("notesHtml", value)}
            />
          </div>
        </section>
      </div>

      <CreateItemDialog
        open={showRenameDialog}
        title="重命名角色"
        label="角色名称"
        placeholder={currentCharacter.name}
        confirmText="确认重命名"
        onClose={() => setShowRenameDialog(false)}
        onConfirm={(newName) => renameCharacter(currentCharacter.id, newName)}
      />
    </div>
  );
}
