// eleventy.config.js or inside your .eleventy.js
import ical from "ical-generator";
import fs from "fs";
import path from "path";
import fetchWithCache from "./lib/fetchWithCache.js";

let calendarStore = {};
console.log("[legistar] Plugin loaded");

export default function (eleventyConfig) {
  //FIXME: these should be parameters
  const CACHE_DURATION = 36000;
  const client = "santaclara";

  eleventyConfig.addShortcode("calendarLinks", function () {
    const calendarLinks = [
      "<table class='calendar-links zebra'>",
      "<tr><th>Commision</th><th colspan=3>Add to Calendar</th></tr>"
    ];

    for (const calendarName of Object.keys(calendarStore).sort()) {
      const slug = calendarName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const fileUrl = `${this.ctx.baseURL}/calendars/${slug}.ics`;
      const webcalUrl = fileUrl.replace(/^https?/, "webcal");
      const googleUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(fileUrl)}`;
      const outlookUrl = `https://outlook.live.com/owa/?path=/calendar/action/compose&rru=addsubscription&url=${encodeURIComponent(fileUrl)}&name=${encodeURIComponent(calendarName)}`;

      calendarLinks.push(`
      <tr>
        <td>${calendarName}</td>
        <td><a href="${webcalUrl}">
          <img eleventy:widths="32,32" src="/logos/apple.png" alt="Subscribe in Apple Calendar" title="Subscribe in Apple Calendar">
        </a></td>
        <td><a href="${googleUrl}" target="_blank">
          <img eleventy:widths="32,32" src="/logos/google.png" alt="Add to Google Calendar" title="Add to Google Calendar">
        </a></td>
        <td><a href="${outlookUrl}" target="_blank">
          <img eleventy:widths="32,32" src="/logos/outlook.png" alt="Add to Outlook" title="Add to Outlook">
        </a></td>
      </tr>
    `);
    }

    calendarLinks.push("</table>");
    return calendarLinks.join("\n");
  }); // addShortcode

  eleventyConfig.on("beforeBuild", async () => {
    const calendars = {};
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearAgoString = oneYearAgo.toISOString().split("T")[0];


    const bodies = await fetchWithCache(`https://webapi.legistar.com/v1/${client}/bodies`, CACHE_DURATION);

    for (const body of bodies) {
      calendars[body.BodyName] = ical({
        name: body.BodyName,
        timezone: "America/Los_Angeles"
      });
      const eventsUrl = `https://webapi.legistar.com/v1/${client}/events?$filter=EventDate%20ge%20datetime'${oneYearAgoString}'%20and%20EventBodyName%20eq%20'${encodeURIComponent(body.BodyName.replace(/'/g, "''"))}'&$orderby=EventDate%20asc`
      const events = await fetchWithCache(eventsUrl, CACHE_DURATION);

      for (const event of events) {

        // Parse start datetime, default events to 90 minutes
        let startDate = new Date(event.EventDate);
        if (event.EventTime) {
          startDate = new Date(startDate.toDateString() + " " + event.EventTime);
        }
        const endDate = structuredClone(startDate);
        endDate.setMinutes(startDate.getMinutes() + 90)

        const description = `
${event.EventAgendaFile ? `Agenda: ${event.EventAgendaFile}` : ""}
${event.EventMinutesFile ? `Minutes: ${event.EventMinutesFile}` : ""}
${event.EventVideoPath ? `Video: ${event.EventVideoPath}` : ""}`;

        calendars[body.BodyName].createEvent({
          start: startDate,
          end: endDate,
          title: event.EventTitle || `${body.BodyName} Meeting`,
          summary: event.EventTitle || `${body.BodyName} Meeting`,
          description: description,
          url: event.EventInSiteURL || undefined,
          location: event.EventLocation || "",
        });
      }

    };


    // Write each .ics file to the output folder
    const outDir = path.resolve(eleventyConfig.dir.output, "calendars");
    fs.mkdirSync(outDir, { recursive: true });
    for (const [body, calendar] of Object.entries(calendars)) {
      const safeName = body.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const filepath = path.join(outDir, `${safeName}.ics`);
      fs.writeFileSync(filepath, calendar.toString());
      console.log(`✅ Wrote ${filepath}`);
    }

    calendarStore = calendars;
  }); // beforeBuild
};
