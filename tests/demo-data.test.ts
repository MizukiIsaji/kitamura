import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDemoData,filterDemoPosts} from '../src/lib/demo-data';
import {categories} from '../src/lib/domain';
import {postSchema,profileSchema,coachSchema,planSchema,consultationSchema} from '../src/lib/validation';

test('demo fixtures have valid content, references and all consultation states',()=>{
 const data=createDemoData();
 const profileIds=new Set(data.profiles.map(profile=>profile.id));
 assert.equal(profileIds.size,6);
 assert.equal(data.posts.length,14);
 assert.equal(new Set(data.posts.map(post=>post.id)).size,14);
 for(const profile of data.profiles)assert(profileSchema.safeParse(profile).success,profile.display_name);
 for(const post of data.posts){assert(profileIds.has(post.user_id));assert(postSchema.safeParse(post).success,post.title);}
 for(const coach of data.coaches){assert(profileIds.has(coach.user_id));assert(coachSchema.safeParse(coach).success);}
 for(const plan of data.plans){assert(data.coaches.some(coach=>coach.user_id===plan.coach_id));assert(planSchema.safeParse(plan).success);}
 for(const request of data.requests){
  const plan=data.plans.find(plan=>plan.id===request.plan_id)!;
  assert(plan);assert.equal(request.coach_id,plan.coach_id);assert.equal(request.price_yen,plan.price_yen);
  assert(consultationSchema.safeParse(request).success);
 }
 assert.deepEqual(new Set(data.requests.map(request=>request.status)),new Set(['requested','accepted','declined','cancelled']));
 for(const comment of data.comments){assert(data.posts.some(post=>post.id===comment.post_id));assert(profileIds.has(comment.user_id));}
 assert(data.profiles.some(profile=>!data.posts.some(post=>post.user_id===profile.id)),'new account with no posts');
 assert(data.coaches.some(coach=>coach.status==='pending'));
 assert(data.plans.some(plan=>!plan.is_active));
});

test('public, own, saved and following previews respect fixture visibility',()=>{
 const data=createDemoData('2026-10-17');
 assert.equal(filterDemoPosts(data).length,12);
 for(const category of Object.keys(categories))assert(filterDemoPosts(data,{category}).length>0);
 const own=filterDemoPosts(data,{view:'mine'});
 assert.equal(own.length,3);assert(own.some(post=>!post.is_public));
 const otherPrivate=data.posts.find(post=>!post.is_public&&post.user_id!==data.viewerId)!;
 otherPrivate.bookmarked=true;
 for(const view of ['feed','following','mine','saved'])assert(!filterDemoPosts(data,{view}).some(post=>post.id===otherPrivate.id));
 assert(filterDemoPosts(data,{view:'following'}).every(post=>data.following.includes(post.user_id)));
 assert.equal(filterDemoPosts(data,{view:'saved'}).length,2);
 assert.equal(filterDemoPosts(data,{q:'存在しない釣果です'}).length,0);
 assert.equal(filterDemoPosts(data,{category:'trout',q:'  流れの脇  '}).length,1);
 assert.equal(filterDemoPosts(data,{q:'神奈川県'}).length,2);
});

test('fixtures reset without sharing mutable state and dates stay relative to Japan today',()=>{
 const first=createDemoData('2026-10-17'),second=createDemoData('2026-10-17');
 first.posts[0].bookmarked=true;first.following.length=0;
 assert.equal(second.posts[0].bookmarked,false);assert.equal(second.following.length,1);
 assert.equal(second.posts[0].fished_on,'2026-10-17');assert.equal(second.requests[0].preferred_date,'2026-10-24');
 assert.equal(createDemoData('2026-12-29').requests[0].preferred_date,'2027-01-05');
 assert.deepEqual(JSON.parse(JSON.stringify(second)),second);
});
