alias Racon.{Battle,Tables}
alias Racon.Battle.Unit
heroes=Tables.all("HeroBase") |> Enum.filter(&(&1."Type" == 1)) |> Enum.sort_by(& &1."Id") |> Enum.take_every(7) |> Enum.take(24)
ids=Enum.map(heroes,& &1."Id")
fields=[:id,:hero_id,:camp,:station,:model,:element,:career,:normal,:actives,:passives,:cd,:hp,:hp_max,:attrs,:level,:is_boss,:hurt,:damage,:cure]
fixtures=for group <- 0..3, level <- [60,120], seed <- 1..5, boss <- [false,true] do
 lineup=Enum.slice(ids,group*6,6)
 enemies=Enum.slice(ids,rem(group+1,4)*6,6)
 atk=for {id,i} <- Enum.with_index(lineup), do: Unit.from_monster(id,Unit.station(101,i),camp: 1,level: level)
 defn=for {id,i} <- Enum.with_index(enemies), do: Unit.from_monster(id,Unit.station(101,i),level: level)
 defn=if boss, do: Enum.map(defn,fn u -> %{u | is_boss: 1} end), else: defn
 x=Battle.run(atk,defn,map_id: 100101,seed: seed,id: 1)
 %{seed: seed,mapId: 100101,lineup: lineup,level: level,boss: boss,maxRounds: Battle.max_rounds(100101),input: Enum.map(atk++defn,&Map.take(&1,fields)),expected: %{resultCode: x.result,rounds: x.rounds,heroes: Enum.map(x.units,&Map.take(&1,[:id,:hp,:hp_max,:damage,:hurt,:cure]))}}
end
File.write!("/audit/battle-advanced.json",Jason.encode!(fixtures,pretty: true))
