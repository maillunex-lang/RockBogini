alias Racon.Tables
rows=for a <- Tables.all("MapAdventure"), into: %{}, do: {a."Id",%{level: a."Level",next: a."NextId",rewards: Enum.map(a."PassRewards",& &1."Items")}}
File.write!("/audit/campaign-rewards.json",Jason.encode!(rows))
