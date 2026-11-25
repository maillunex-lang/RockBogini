alias Racon.Tables
chapters =
  for c <- Tables.all("AdventureChapter") do
    %{
      id: c."Id",
      name: c."Name",
      bg: c."Bg",
      mapIds: c."MapIds",
      monsters: c."Monsters",
      heros: Enum.map(c."Heros", & &1."Items")
    }
  end
worlds =
  for w <- Tables.all("MapWorld") do
    %{id: w."Id", chapterIds: w."ChapterIds", owningMap: w."OwningMap", position: w."Position"}
  end
first =
  Tables.all("MapAdventure")
  |> Enum.filter(&(&1."Type" == 1))
  |> Enum.map(& &1."Id")
  |> Enum.min()
map_chapter =
  for c <- chapters, mid <- c.mapIds, into: %{} do
    {Integer.to_string(mid), c.id}
  end
reward_ids = MapSet.new(for a <- Tables.all("MapAdventure"), a."Type" == 1, do: a."Id")
orphans = MapSet.difference(reward_ids, MapSet.new(for {_k, _} <- map_chapter, do: String.to_integer(_k))) |> MapSet.to_list() |> Enum.sort()
out = %{
  firstMapId: first,
  orphanMapIds: orphans,
  chapterCount: length(chapters),
  worldCount: length(worlds),
  chapters: chapters,
  worlds: worlds,
  mapChapter: map_chapter,
  exportedAt: DateTime.utc_now() |> DateTime.to_iso8601()
}
File.write!("/audit/campaign-chapters.json", Jason.encode!(out))
IO.puts("chapters=#{length(chapters)} worlds=#{length(worlds)} maps=#{map_size(map_chapter)} orphans=#{inspect(orphans)}")
