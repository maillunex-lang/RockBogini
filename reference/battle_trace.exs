alias Racon.{Battle, Player, Proto, Templates}
alias Racon.Battle.Unit
models = for {type,recs} <- Templates.new_player_models(), mod = Proto.module(type), into: %{} do
 {type, Map.new(recs,fn {sid,rec}->{String.to_integer(sid),Proto.Json.from_map(mod,rec)} end)}
end
p=%Player{uid: 4242,models: models}
maps=Racon.Tables.all("MapBase") |> Enum.filter(fn m -> m."Id" >= 100101 and m."Id" < 100400 and m."Heros" != [] end) |> Enum.sort_by(& &1."Id") |> Enum.take_every(3) |> Enum.take(12)
fields=[:id,:camp,:station,:model,:element,:normal,:actives,:passives,:cd,:hp,:hp_max,:attrs,:level,:is_boss,:hurt,:damage,:cure]
fixtures=for map <- Enum.filter(maps,& (&1."Id" == 100134)), lineup <- [[1001,1002,0,1003,0,0],[1003,0,1001,0,1002,0]], seed <- 1..1 do
 atk=for {sid,slot} <- Enum.with_index(lineup),sid>0, do: Unit.from_hero(p,sid,Unit.station(101,slot))
 defenders=Unit.stage(map."Id")
 x=Battle.run(atk,defenders,map_id: map."Id",seed: seed,id: 1)
 %{seed: seed,mapId: map."Id",lineup: lineup,maxRounds: Battle.max_rounds(map."Id"),input: Enum.map(atk++defenders, &Map.take(&1,fields)),trace: inspect(x.report."Data",limit: :infinity, printable_limit: :infinity),expected: %{resultCode: x.result,rounds: x.rounds,heroes: Enum.map(x.units,&Map.take(&1,[:id,:hp,:hp_max,:damage,:hurt,:cure]))}}
end
File.write!("/audit/battle-trace.json",Jason.encode!(fixtures,pretty: true))
