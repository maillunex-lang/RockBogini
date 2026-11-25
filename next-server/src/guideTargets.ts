/** Curated GuideStep Id → Next UI `data-guide` key (original positions are live nodes). */
export const GUIDE_STEP_TARGETS:Record<number,string>={
 // 31 formation after summon
 3103:'city-nav-hero',
 3104:'campaign-map-available',
 // 35 / 85 / 115 / 125 / 145 settle → back
 3601:'campaign-close',
 8601:'campaign-close',
 11601:'campaign-close',
 12601:'campaign-close',
 14601:'campaign-close',
 // 41 progress rewards
 4104:'campaign-map-available',
 4105:'campaign-map-available',
 // 51 merge / 61 level / 71 equip / 81 deploy → heroes
 5102:'city-nav-hero',
 5104:'city-nav-hero',
 5106:'city-nav-hero',
 6102:'city-nav-hero',
 6103:'city-nav-hero',
 7202:'city-nav-hero',
 8103:'city-nav-hero',
 8104:'campaign-map-available',
 // 91 senior summon
 9102:'city-summon',
 9103:'city-summon',
 9104:'city-summon',
 // 101 hang-up / 131 idle reward → campaign dock
 10102:'city-nav-battle',
 10103:'city-nav-battle',
 13202:'city-nav-battle',
 13103:'city-nav-battle',
 // 111 deploy / continue fight
 11201:'city-nav-hero',
 11101:'city-nav-hero',
 11102:'campaign-map-available',
 12201:'campaign-map-available',
 12202:'campaign-map-available',
 12102:'campaign-map-available',
 14201:'campaign-map-available',
 14202:'campaign-map-available',
 14102:'campaign-map-available',
 // 151 power-up
 15202:'city-nav-hero',
 15203:'city-nav-hero',
 15103:'city-nav-hero',
};

export function guideTargetForStep(stepId:number):string|undefined{
 return GUIDE_STEP_TARGETS[stepId];
}
