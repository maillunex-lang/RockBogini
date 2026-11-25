alias Racon.{Battle,Tables}
alias Racon.Battle.Unit
heroes=Tables.all("HeroBase") |> Enum.filter(&(&1."Type" == 1)) |> Enum.sort_by(& &1."Id") |> Enum.take_every(7) |> Enum.take(24)
ids=Enum.map(heroes,& &1."Id")
fields=[:id,:hero_id,:camp,:station,:model,:element,:career,:normal,:actives,:passives,:cd,:hp,:hp_max,:attrs,:level,:is_boss,:hurt,:damage,:cure]
maps=Tables.all("AllianceTest") |> Enum.sort_by(& &1."Id") |> Enum.flat_map(& &1."Monsters") |> Enum.uniq() |> Enum.take(12)
fixtures=for sid <- [1150530,1350130,1355310], seed <- 1..5 do
 map=100101
 level=120
 lineup=Enum.take(ids,3)
 [a,b,c]=for {id,i} <- Enum.with_index(lineup), do: Unit.from_monster(id,Unit.station(101,i),camp: 1,level: level)
 atk=[%{a | actives: [sid], cd: %{sid => 0}, passives: []},%{b | hp: 0},c]
 [boss | _]=Unit.stage(map)
 defn=[%{boss | hp: 1000000, hp_max: 1000000}]
 x=Battle.run(atk,defn,map_id: map,seed: seed,id: 1)
 %{seed: seed,mapId: map,lineup: lineup,level: level,boss: true,maxRounds: Battle.max_rounds(map),input: Enum.map(atk++defn,&Map.take(&1,fields)),pages: (for page <- x.report."Data", page."DataType" in [1,2,3], do: %{dataType: page."DataType",round: page."Round",events: (for h <- page."HitPoints", e <- h."Events", e."EventType" in [1,2,3,4,5,6,7,21,22,23,24,25,26,27], do: %{index: h."Index",target: e."TargetId",type: e."EventType",value: e."Value"})}),actions: (for page <- x.report."Data", page."DataType" == 2, do: %{round: page."Round",actor: page."HeroId",skillId: page."SkillId",targets: page."SkillTargets",events: (for h <- page."HitPoints", e <- h."Events", e."EventType" in [1,2,3,4,5,6,7,21,22,23,24,25,26,27], do: %{index: h."Index",target: e."TargetId",type: e."EventType",value: e."Value"})}),expected: %{resultCode: x.result,rounds: x.rounds,heroes: Enum.map(x.units,&Map.take(&1,[:id,:hp,:hp_max,:damage,:hurt,:cure]))}}
end
File.write!("/audit/battle-revive-events.json",Jason.encode!(fixtures,pretty: true))
