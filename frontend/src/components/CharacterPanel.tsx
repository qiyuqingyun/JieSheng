import { useMemo, useState } from "react";
import { useProject } from "../contexts/ProjectContext";

export default function CharacterPanel() {
  const { projectMetadata, currentCharacterId, loadCharacter } = useProject();
  const [keyword, setKeyword] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const characters = projectMetadata?.characters ?? [];

  const roles = useMemo(() => {
    const baseRoles = ["all"];
    const roleSet = new Set(characters.map((character) => character.role || "supporting"));
    return [...baseRoles, ...Array.from(roleSet)];
  }, [characters]);

  const filteredCharacters = useMemo(() => {
    const lowerKeyword = keyword.trim().toLowerCase();
    return characters.filter((character) => {
      const roleMatched = roleFilter === "all" || character.role === roleFilter;
      const keywordMatched =
        !lowerKeyword || character.name.toLowerCase().includes(lowerKeyword);
      return roleMatched && keywordMatched;
    });
  }, [characters, roleFilter, keyword]);

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-2 border-b border-gray-200 p-3">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜索角色名"
          className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {roles.map((role) => (
            <option key={role} value={role}>
              {role === "all" ? "全部定位" : role}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto p-4">
        {filteredCharacters.map((character) => (
          <div
            key={character.id}
            onClick={() => loadCharacter(character.id)}
            className={`cursor-pointer rounded-lg border p-3 text-sm transition ${
              currentCharacterId === character.id
                ? "border-blue-300 bg-blue-50 text-blue-900 shadow-sm"
                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">{character.name}</p>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                {character.role || "配角"}
              </span>
            </div>
            {character.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {character.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}

        {filteredCharacters.length === 0 && (
          <div className="rounded border border-dashed border-gray-300 p-4 text-center text-sm text-gray-400">
            暂无角色，点击上方“+ 新建”创建
          </div>
        )}
      </div>
    </div>
  );
}
