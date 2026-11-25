alias Racon.{Battle, Player, Proto, Templates}
alias Racon.Battle.Unit
models = for {type,recs} <- Templates.new_player_models(), mod = Proto.module(type), into: %{} do
 {type, Map.new(recs,fn {sid,rec}->{String.to_integer(sid),Proto.Json.from_map(mod,rec)} end)}
end
p=%Player{uid: 4242,models: models}
atk=for {sid,slot} <- Enum.with_index([1001,1002,0,1003,0,0]),sid>0, do: Unit.from_hero(p,sid,Unit.station(101,slot))
defenders=Unit.stage(100101)
fields=[:id,:camp,:station,:model,:element,:normal,:actives,:passives,:cd,:hp,:hp_max,:attrs,:level,:is_boss,:hurt,:damage,:cure]
fixtures=for seed <- 1..100 do
 x=Battle.run(atk,defenders,map_id: 100101,seed: seed,id: 1)
 %{seed: seed,maxRounds: Battle.max_rounds(100101),input: Enum.map(atk++defenders, &Map.take(&1,fields)),expected: %{resultCode: x.result,rounds: x.rounds,heroes: Enum.map(x.units,&Map.take(&1,[:id,:hp,:hp_max,:damage,:hurt,:cure]))}}
end
File.write!("/audit/battle-compare.json",Jason.encode!(fixtures,pretty: true))
