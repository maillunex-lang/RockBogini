alias Racon.{Battle,Tables}
alias Racon.Battle.Unit
heroes=Tables.all("HeroBase") |> Enum.filter(&(&1."Type" == 1)) |> Enum.sort_by(& &1."Id") |> Enum.take_every(7) |> Enum.take(24)
ids=Enum.map(heroes,& &1."Id")
fields=[:id,:hero_id,:camp,:station,:model,:element,:career,:normal,:actives,:passives,:cd,:hp,:hp_max,:attrs,:level,:is_boss,:hurt,:damage,:cure]
maps=Tables.all("AllianceTest") |> Enum.sort_by(& &1."Id") |> Enum.flat_map(& &1."Monsters") |> Enum.uniq() |> Enum.take(12)
fixtures=for map <- maps, group <- 0..1, level <- [120], seed <- 1..3 do
 lineup=Enum.slice(ids,group*6,6)
 atk=for {id,i} <- Enum.with_index(lineup), do: Unit.from_monster(id,Unit.station(101,i),camp: 1,level: level)
 [boss | _]=Unit.stage(map)
 defn=[%{boss | is_boss: 1}]
 x=Battle.run(atk,defn,map_id: map,seed: seed,id: 1)
 %{seed: seed,mapId: map,lineup: lineup,level: level,boss: true,maxRounds: Battle.max_rounds(map),input: Enum.map(atk++defn,&Map.take(&1,fields)),actions: (for page <- x.report."Data", page."DataType" == 2, do: %{round: page."Round",actor: page."HeroId",skillId: page."SkillId",targets: page."SkillTargets",events: (for h <- page."HitPoints", e <- h."Events", e."EventType" in [1,2,3,6,21], do: %{index: h."Index",target: e."TargetId",type: e."EventType",value: e."Value"})}),expected: %{resultCode: x.result,rounds: x.rounds,heroes: Enum.map(x.units,&Map.take(&1,[:id,:hp,:hp_max,:damage,:hurt,:cure]))}}
end
File.write!("/audit/battle-hitpoints.json",Jason.encode!(fixtures,pretty: true))
