alias Racon.{Battle,Tables}
alias Racon.Battle.Unit
heroes=Tables.all("HeroBase") |> Enum.filter(&(&1."Type" == 1)) |> Enum.sort_by(& &1."Id") |> Enum.take_every(7) |> Enum.take(24)
ids=Enum.map(heroes,& &1."Id")
fields=[:id,:hero_id,:camp,:station,:model,:element,:career,:normal,:actives,:passives,:cd,:hp,:hp_max,:attrs,:level,:is_boss,:hurt,:damage,:cure]
all=Tables.all("MapBase") |> Enum.filter(&(&1."Type" in [4,5,26,28,29,32,33,34,35,38] and &1."Heros" != [])) |> Enum.sort_by(& &1."Id")
IO.puts("Type 3 boss maps: #{length(all)}")
maps=all |> Enum.take_every(max(div(length(all),24),1)) |> Enum.take(24)
fixtures=for cfg <- maps, group <- 0..1, seed <- 1..3 do
 map=cfg."Id"
 level=120
 lineup=Enum.slice(ids,group*6,6)
 atk=for {id,i} <- Enum.with_index(lineup), do: Unit.from_monster(id,Unit.station(101,i),camp: 1,level: level)
 defn=Enum.map(atk,fn u -> %{u | id: u.station+101,camp: -1,hp: 100000000,hp_max: 100000000,attrs: Map.put(u.attrs,0,1)} end)
 atk=Enum.map(atk,fn u -> %{u | hp: 100000000,hp_max: 100000000,attrs: Map.put(u.attrs,0,1)} end)
 x=Battle.run(atk,defn,map_id: map,seed: seed,id: 1,max_rounds: 15)
 %{seed: seed,mapId: map,lineup: lineup,level: level,boss: false,maxRounds: 15,roundBuffs: Map.new(Enum.map(Tables.get("MapType",cfg."Type")."RoundBuff",fn x -> List.to_tuple(x."Items") end)),input: Enum.map(atk++defn,&Map.take(&1,fields)),pages: (for page <- x.report."Data", page."DataType" in [1,2,3], do: %{dataType: page."DataType",round: page."Round",roundBuffId: page."RoundBuffId",events: (for h <- page."HitPoints", e <- h."Events", e."EventType" in [1,2,3,4,5,6,7,21,22,23,24,25,26,27], do: %{index: h."Index",target: e."TargetId",type: e."EventType",value: e."Value"})}),actions: (for page <- x.report."Data", page."DataType" == 2, do: %{round: page."Round",actor: page."HeroId",skillId: page."SkillId",targets: page."SkillTargets",events: (for h <- page."HitPoints", e <- h."Events", e."EventType" in [1,2,3,4,5,6,7,21,22,23,24,25,26,27], do: %{index: h."Index",target: e."TargetId",type: e."EventType",value: e."Value"})}),expected: %{resultCode: x.result,rounds: x.rounds,heroes: Enum.map(x.units,&Map.take(&1,[:id,:hp,:hp_max,:damage,:hurt,:cure]))}}
end
File.write!("/audit/battle-round-buffs.json",Jason.encode!(fixtures,pretty: true))
