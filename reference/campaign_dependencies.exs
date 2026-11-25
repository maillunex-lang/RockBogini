alias Racon.Tables
pairs=fn rows -> Enum.map(rows,& &1."Items") end
idle=Map.new(Tables.all("MapAdventure"),fn a->{a."Id",%{common: pairs.(a."Rewards"),random: pairs.(a."RandomRewards")}} end)
libs=Map.new(Tables.all("SimpleRandomLib"),fn a->{a."Id",pairs.(a."Weight")} end)
modules=Enum.map(Tables.all("GameModule"),fn a->%{id: a."Id",r1: pairs.(a."Requirements1"),r2: pairs.(a."Requirements2")} end)
File.write!("/audit/campaign-dependencies.json",Jason.encode!(%{idle: idle,libs: libs,modules: modules,limit: trunc(Tables.fetch!("GlobalSetting","AdventureHangUpRewardTimeUpperLimit")."Value")}))
