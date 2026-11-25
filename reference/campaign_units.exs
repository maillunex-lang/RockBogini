alias Racon.{Battle,Tables}
alias Racon.Battle.Unit
heroes=Tables.all("HeroBase") |> Enum.filter(&(&1."Type" == 1)) |> Enum.sort_by(& &1."Id") |> Enum.take_every(7) |> Enum.take(24)
ids=Enum.map(heroes,& &1."Id")
fields=[:id,:hero_id,:sid,:star,:skin_id,:skills,:camp,:station,:model,:element,:career,:normal,:actives,:passives,:cd,:hp,:hp_max,:attrs,:level,:is_boss,:hurt,:damage,:cure]
all=Tables.all("MapBase") |> Enum.filter(&(&1."Id">=100101 and &1."Id"<200000 and &1."Type"==1 and &1."Heros" != [])) |> Enum.sort_by(& &1."Id")
IO.puts("Campaign maps: #{length(all)}")
maps=all |> Enum.take_every(max(div(length(all),24),1)) |> Enum.take(24)
rows=for cfg <- all do
 map=cfg."Id"
 {map,%{maxRounds: Battle.max_rounds(map),bg: cfg."Bg",units: Enum.map(Unit.stage(map),&Map.take(&1,fields))}}
end
File.write!("/audit/campaign-units.json",Jason.encode!(Map.new(rows)))
